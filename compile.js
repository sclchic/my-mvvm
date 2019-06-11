/**
 * 解析el
 * vm: 视图模型
 * exp: 指令对应的字符串
 * MVVM中使用方法 this.$Compile = new Compile($options.el || )
 */
import Watcher from './watcher';

function trim(str) {
    return str.replace(/(^\s*)|(\s*$)/g, "");
}

function trigger (el, type) {
    const e = document.createEvent('HTMLEvents')
    e.initEvent(type, true, true)
    el.dispatchEvent(e)
}

class Compile {
    constructor(el, vm) {
        // $vm MVVM实例本身
        this.$vm = vm;

        // 获取传入的根元素
        this.$el = this.isElementNode(el) ? el : document.querySelector(el);

        if (this.$el) {
            // 将所有实际元素转化为文档片段，带来更好的性能
            // createDocumentFragment https://developer.mozilla.org/zh-CN/docs/Web/API/Document/createDocumentFragment
            this.$fragment = this.node2Fragment(this.$el);
            
            // 执行具体编译操作
            this.init();

            // 将碎步还原到实际dom上
            this.$el.appendChild(this.$fragment);
        }
    }

    node2Fragment(el) {
        var fragment = document.createDocumentFragment(),
            child;
        
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }
        
        return fragment;
    }

    // 编译碎片
    init() {
        this.compileElement(this.$fragment);
    }

    compileElement(el) {
        let childNodes = el.childNodes;

        // 递归编译每一个节点，如果是文本节点采用文本编译方式，元素节点采用元素编译方式，如果有子节点继续递归调用
        [].slice.call(childNodes).forEach((node) => {
            // 获取节点及其后代的文本内容
            const text = node.textContent;

            // 判断{{}}的正则

            const reg = /\{\{(.*)\}\}/;

            if (this.isElementNode(node)) {
                this.compile(node);
            } else if (this.isTextNode(node) && reg.test(text)) {
                this.compileText(node, trim(RegExp.$1));
            }

            if (node.childNodes && node.childNodes.length) {
                this.compileElement(node);
            }
        })
    }

    // 编译元素节点
    compile(node) {
        const nodeAttrs = node.attributes;

        // 遍历该元素所有属性节点
        [].slice.call(nodeAttrs).forEach((attr) => {
            const attrName = attr.name;

            if (this.isDirective(attrName)) {
                // 获取属性值
                const exp = trim(attr.value);

                // 获取属性的具体含义
                const dir = attrName.substring(2);

                if (this.isEventDirective(dir)) {
                    // 执行事件指令的编译方式
                    compileUtil.eventHandler(node, this.$vm, exp, dir);
                } else {
                    // 执行普通指令的编译方式
                    compileUtil[dir] && compileUtil[dir](node, this.$vm, exp);
                }

                // 最后渲染真正的DOM时去掉vue指令
                node.removeAttribute(attrName);
            }
        })
    }

    /**
     * 编译带{{}}的文本节点
     * @param {Node 文本节点} node
     * @param {String v-text或者{{}} 内的值} exp
     */
    compileText(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    }

    /**
     * 判断属性节点名中是否包含vue指令
     * 例：v-html="a"
     */
    isDirective(attrName) {
        return attrName.indexOf('v-') == 0;
    }

    /**
     * 判断是否是文本节点
     */
    isTextNode(node) {
        return node.nodeType == 3;
    }

    /**
     * 判断是否是元素节点
     */
    isElementNode(node) {
        return node.nodeType == 1;
    }

    /**
     * 判断是否是事件指令
     * @param {String: 'on'} dir 
     */
    isEventDirective(dir) {
        return dir.indexOf('on') === 0;
    }
}

// 指令处理集合
const compileUtil = {
    // v-text 或者 文本节点 {{ xxx }}指令处理方式
    text(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    // v-html指令处理方式
    html(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    // v-model指令处理方式
    // 一般v-model都绑定在input上，由于数据是双向绑定的，所以input值改变，vm中的值也应该发生改变
    model(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        let val = this._getVMVal(vm, exp);
        // 处理IME情况，在中文没有选定之前不进行input事件处理
        let inCompositionEvent = false;
        node.addEventListener('compositionstart', function(e) {
            inCompositionEvent = true;
        })

        node.addEventListener('compositionend', function(e) {
            inCompositionEvent = false;
            trigger(e.target, 'input');
        })

        node.addEventListener('input', (e) => {
            if (inCompositionEvent) {
                return;
            }
            const newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            this._setVMVal(vm, exp, newValue);
            val = newValue;
        })
    },


    /**
     * 
     * @param {Object MVVM实例} vm 
     * @param {String 指令值} exp 
     * 例如: v-html="a.b.c"  vm = {a: {b: {c: 3}}} exp="a.b.c"
     */
    _getVMVal(vm, exp) {
        var val = vm;
        exp = exp.split('.');

        /**
         *  第n次循环  |  val结果
         *   1        |  {b: {c: 3}}
         *   2        |  {c: 3}
         *   3        |  3
         */  
        exp.forEach((k) => {
            val = val[k];
        });
        return val;
    },

    /**
     * 
     * @param {Object MVVM实例} vm 
     * @param {String 指令值} exp 
     * @param {String 用户触发改变后的值} value 
     * 例如: v-model="a.b.c"  vm = {a: {b: {c: 3}}} exp="a.b.c" value=999
     */
    _setVMVal(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');

        /**
         *  第n次循环  |  val结果
         *   1        |  {b: {c: 3}}
         *   2        |  {c: 3}
         *   3        |  999
         */  
        exp.forEach((k, i) => {
            // 非最后一个key,更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        })
    },

    // v-bind指令处理方式，及代理其他指令的处理方式
    bind(node, vm, exp, dir) {
        // 获取对应指令的内容更新函数。例如a元素挂载了v-html,得到updater[htmlUpdater]
        const updaterFn = updater[dir + 'Updater'];

        // 利用uodater[htmlUpdater]给a元素的内容进行初始化
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        // 添加观测实例，一旦值有变化启动更新函数
        new Watcher(vm, exp, (value, oldValue) => {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler(node, vm, exp, dir) {
        // 获取v-on具体绑定的是什么事件
        const eventType = dir.split(':')[1],
            // 获得具体事件触发函数
            fn = vm.$options.methods && vm.$options.methods[exp];

        // 绑定原生事件
        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    }
};

// 指令所对应的更新函数
const updater = {
    /**
     * 对v-text 或者 {{ }}的内容更新
     * @param {Node 文本节点} node 
     * @param {vm._data中的属性值} value 
     */
    textUpdater(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    modelUpdater(node, value) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};

export default Compile;
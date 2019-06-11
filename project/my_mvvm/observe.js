function observe(value) {
    // 检测是否是对象，不是则退出
    if (!value || typeof value !== 'object') {
        return;
    }

    // 是对象则继续遍历观测属性
    return new Observe(value);
}

// 给vm中的data添加观察者
class Observe {
    constructor(data) {
        this.data = data;
        // 遍历data
        this.walk();
    }

    walk() {
        // 遍历data的每个属性
        Object.keys(this.data).forEach((key) => {
            this.convert(key, this.data[key]);
        })
    }

    convert(key, val) {
        this.defineReactive(key, val);
    }

    /**
     * 具体给每个属性添加setter和getter
     */
    defineReactive(key, val) {
        // 每次遍历都生成一个订阅器
        const dep = new Dep();

        // 对象的属性可能还是对象，所以需要继续遍历下去
        let childObj = observe(val);

        Object.defineProperty(this.data, key, {
            configurable: false, // 不可delete删除，不可修改其他属性描述符
            enumerable: true, // 可枚举
            get() {
                if (Dep.target) {
                    dep.depend();
                }
                return val;
            },
            set(newVal) {
                if (newVal === val) {
                    return;
                }

                val = newVal;
                // 新的值如果是 object 的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        })

    }
}

let uid = 0;

class Dep {
    constructor() {
        this.id = uid++;
        this.subs = [];
    }

    addSub(sub) {
        this.subs.push(sub);
    }

    depend() {
        Dep.target.addDep(this);
    }

    removeSub(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    }   

    notify() {
        this.subs.forEach((sub) => {
            sub.update();
        })
    }
}

Dep.target = null;

export {
    observe,
    Dep
};
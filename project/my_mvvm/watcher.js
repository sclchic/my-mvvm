import {Dep} from './observe';

class Watcher {
    constructor(vm, expOrFn, cb) {
        this.cb = cb;
        this.vm = vm;
        // 指令字符串， v-hmt;l = "a ? b : c" 或者 v-html = "a.b.c"
        // 指令字符串可能是一个表达式也可能是函数
        this.expOrFn = expOrFn;
        this.depIds = {};

        if (typeof expOrFn === 'function') {
            this.getter = expOrFn;
        } else {
            this.getter = this.parseGetter(expOrFn);
        }

        // 触发属性的getter从而在dep添加自己
        this.value = this.get();
    }

    update() {
        // 当值发生改变时
         this.run();
    }

    run() {
        const value = this.get(),
            oldValue = this.value;
        
        if (value !== oldValue) {
            this.value = value;
            this.cb.call(this.vm, value, oldValue);
        }
    }

    addDep(dep) {
        // 每个订阅器都有一个id
        if (!this.depIds.hasOwnProperty(dep.id)) {
            dep.addSub(this);
            this.depIds[dep.id] = dep;
        }
    }

    parseGetter(exp) {
        const exps = exp.split('.');

        return function (obj) {
            for (let i = 0, len = exps.length; i < len; i++) {
                if (!obj) {
                    return;
                }
                obj = obj[exps[i]];
            }
            return obj;
        }
    }

    get() {
        // Dep是一个订阅器，Dep.target为一个全局属性，默认为null，代表本次所添加进订阅器中的目标
        // 将本次订阅器的目标指定为该watcher
        Dep.target = this;
        
        const value = this.getter.call(this.vm, this.vm);
        Dep.target = null;
        return value;
    }
}

export default Watcher;
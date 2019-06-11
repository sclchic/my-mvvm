import {observe} from './observe';
import Watcher from './watcher';
import Compile from './compile';

class MVVM {
    constructor(options = {}) {
        this.$options = options;
        this._data = this.$options.data;

        // 数据代理实现vm.xxx -> vm._data.xxx
        Object.keys(this._data).forEach((key) => {
            this._proxyData(key);
        })

        this._initComputed();

        // 遍历data给属性添加setter getter
        observe(this._data);

        this.$compile = new Compile(options.el || document.body, this);
    }

    $watch(key, cb) {
        new Watcher(this, key, cb);
    }

    _proxyData(key) {
        Object.defineProperty(this, key, {
            configurable: false,
            enumerable: true,
            get() {
                return this._data[key];
            },
            set(newVal) {
                this._data[key] = newVal;
            }
        })
    }

    _initComputed() {
        const computed = this.$options.computed;

        if (typeof computed === 'object') {
            Objectkeys(computed).forEach((key) => {
                Object.defineProperty(this, key, {
                    get: typeof computed[key] === 'function' ? computed[key] : computed[key].get,
                    set() {

                    }
                })
            })
        }
    }
}

export default MVVM;
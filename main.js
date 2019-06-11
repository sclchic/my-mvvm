import MVVM from './mvvm';
import "github-fork-ribbon-css/gh-fork-ribbon.css";

new MVVM({
    el: '#app',
    data: {
        someStr: 'hello'
    },
    methods: {
        changeVm() {
            this.someStr = '我改变了';
        }
    }
})
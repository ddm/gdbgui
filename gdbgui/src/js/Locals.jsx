import React from 'react';
import {store} from './store.js';
import GdbVariable from './GdbVariable.jsx';
// import GdbApi from './GdbApi.js';
// import Memory from './Memory.jsx';
// import Util from './Util.js';
// import constants from './constants.js';

class Locals extends React.Component {
    constructor(){
        super()
        this.state = store._store
        store.subscribe(this._store_change_callback.bind(this))
    }

    _store_change_callback(){
        this.setState(store._store)
    }

    render(){
        let content = []
        let sorted_local_objs = _.sortBy(store.get('locals'), unsorted_obj => unsorted_obj.name)

        for (let obj of sorted_local_objs){
            // TODO find full on expression that was created from local and render that instead if it exists...
            content.push(<GdbVariable obj={obj} key={obj.name} expression={obj.name} expr_type='local' />)
        }

        if(content.length === 0){
            content.push(<span key='empty' className='placeholder'>no locals in this context</span>)
        }
        content.push(<div key='tt' id='tooltip' style={{display: 'hidden'}}/>)

        return (
        <div>
            {content}
        </div>
        )
    }
}


// const Locals = {
//     init: function(){
//         new Reactor('#locals', Locals.render)
//         $('body').on('click', '.locals_autocreate_new_expr', Locals.click_locals_autocreate_new_expr)
//     },
//     render: function(){
//         if(store.get('locals').length === 0){
//             return '<span class=placeholder>no variables to display</span>'
//         }
//         let sorted_local_objs = _.sortBy(store.get('locals'), unsorted_obj => unsorted_obj.name)
//         let html = sorted_local_objs.map(local => {
//             let obj = Locals.get_autocreated_obj_from_expr(local.name)
//             if(obj){
//                 let expr = local.name
//                 , is_root = true
//                 if(obj.numchild > 0){
//                     return GdbVariable.get_ul_for_var_with_children(expr, obj, is_root)
//                 }else{
//                     return GdbVariable.get_ul_for_var_without_children(expr, obj, is_root)
//                 }

//             }else{
//                 // turn hex addresses into links to view memory

//                 let value = ''
//                 , plus_or_minus
//                 , cls

//                 if('value' in local){
//                     value = Memory.make_addrs_into_links_react(local.value)
//                     plus_or_minus = local.type.indexOf('*') !== -1  ? '+' : ''// make plus if value is a pointer (has asterisk)
//                 }else{
//                     // this is not a simple type, so no value was returned. Display the plus to indicate
//                     // it can be clicked (which will autocreate and expression that populates the fields)
//                     plus_or_minus = '+'
//                 }

//                 if(plus_or_minus === '+'){
//                     cls = 'locals_autocreate_new_expr pointer'
//                 }


//                 // return local variable name, value (if available), and type
//                     return  `
//                         <span class='${cls}' data-expression='${local.name}'>
//                             ${plus_or_minus} ${local.name}: ${value}
//                         </span>
//                         <span class='var_type'>
//                             ${_.trim(local.type)}
//                         </span>
//                         <br>
//                         `
//             }

//         })
//         return html.join('')
//     },
//     click_locals_autocreate_new_expr: function(e){
//         let expr = e.currentTarget.dataset.expression
//         if(expr){
//             GdbVariable.create_variable(expr, 'local')
//         }
//     },
//     get_autocreated_obj_from_expr: function(expr){
//         for(let obj of store.get('expressions')){
//             if(obj.expression === expr && obj.expr_type === 'local'){
//                 return obj
//             }
//         }
//         return null
//     },
//     clear_autocreated_exprs: function(){
//         let exprs_objs_to_remove = store.get('expressions').filter(obj => obj.expr_type === 'local')
//         exprs_objs_to_remove.map(obj => GdbVariable.delete_gdb_variable(obj.name))
//     },
//     clear: function(){
//         Locals.clear_autocreated_exprs()
//     },
//     inferior_program_exited: function(){
//         Locals.clear()
//     },
//     event_inferior_program_running: function(){
//         Locals.clear()
//     },
// }

export default Locals

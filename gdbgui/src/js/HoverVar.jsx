import React from 'react';
// import {store, Reactor} from './store.js';
// import GdbApi from './GdbApi.js';
// import Memory from './Memory.jsx';
// import Util from './Util.js';
// import constants from './constants.js';

class HoverVar extends React.Component {
    render(){
        return <div id='hovervar' className='hidden'>todo - hosdfver</div>
    }
}

// const HoverVar = {
//     init: function(){
//         $('body').on('mouseover', '#code_table span.n', HoverVar.mouseover_variable)
//         $('body').on('mouseover', '#code_table span.nx', HoverVar.mouseover_variable)
//         $('body').on('mouseenter', '#hovervar', HoverVar.mouseover_hover_window)
//         $('body').on('mouseleave', '#code_table span.n', HoverVar.mouseout_variable)
//         $('body').on('mouseleave', '#code_table span.nx', HoverVar.mouseout_variable)
//         $('body').on('mouseleave', '#hovervar', HoverVar.mouseout_hover_window)
//         new Reactor('#hovervar', HoverVar.render, {after_dom_update: HoverVar.after_dom_update})
//     },
//     enter_timeout: undefined,  // debounce fetching the expression
//     exit_timeout: undefined,  // debounce removing the box
//     left: 0,
//     top: 0,
//     mouseover_variable: function(e){
//         HoverVar.clear_hover_state()

//         let rect = e.target.getBoundingClientRect()
//         , var_name = e.target.textContent

//         // store coordinates of where the box should be displayed
//         HoverVar.left = rect.left
//         HoverVar.top = rect.bottom

//         const WAIT_TIME_SEC = 0.5
//         HoverVar.enter_timeout = setTimeout(
//             ()=>{
//                 let program_stopped = store.get('stack').length > 0
//                 if(program_stopped){
//                     let ignore_errors = true
//                     GdbVariable.create_variable(var_name, 'hover', ignore_errors)
//                 }
//             },
//             WAIT_TIME_SEC * 1000)
//     },
//     mouseout_variable: function(e){
//         void(e)
//         const WAIT_TIME_SEC = 0.1
//         HoverVar.exit_timeout = setTimeout(
//             ()=>{
//                 HoverVar.clear_hover_state()
//             },
//             WAIT_TIME_SEC * 1000
//         )
//     },
//     mouseover_hover_window: function(e){
//         void(e)
//         // Mouse went from hovering over variable name in source code to
//         // hovering over the window showing the contents of the variable.
//         // Don't remove the window in this case.
//         clearTimeout(HoverVar.exit_timeout)
//     },
//     mouseout_hover_window: function(e){
//         void(e)
//         HoverVar.clear_hover_state()
//     },
//     clear_hover_state: function(){
//         clearTimeout(HoverVar.enter_timeout)
//         clearTimeout(HoverVar.exit_timeout)
//         let exprs_objs_to_remove = store.get('expressions').filter(obj => obj.expr_type === 'hover')
//         exprs_objs_to_remove.map(obj => GdbVariable.delete_gdb_variable(obj.name))
//     },
//     render: function(r){
//         void(r)
//         let hover_objs = store.get('expressions').filter(o => o.expr_type === 'hover')
//         , obj
//         if(Array.isArray(hover_objs) && hover_objs.length === 1){
//             obj = hover_objs[0]
//         }
//         HoverVar.obj = obj
//         if (obj){
//             let is_root = true
//             if(obj.numchild > 0){
//                 return GdbVariable.get_ul_for_var_with_children(obj.expression, obj, is_root)
//             }else{
//                 return GdbVariable.get_ul_for_var_without_children(obj.expression, obj, is_root)
//             }
//         }else{
//             return 'no variable hovered'
//         }
//     },
//     after_dom_update: function(r){
//         if(HoverVar.obj){
//             r.node.style.left = HoverVar.left + 'px'
//             r.node.style.top = HoverVar.top + 'px'
//             r.node.classList.remove('hidden')
//         }else{
//             r.node.classList.add('hidden')
//         }

//     }
// }

export default HoverVar

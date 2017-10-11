import React from 'react';
import Memory from './Memory.jsx';
import Util from './Util.js';
import constants from './constants.js';
import {store} from './store.js';
import GdbApi from './GdbApi.js';


class GdbVariable extends React.Component {

    render(){
        const is_root = true
        if(this.props.obj.numchild > 0) {
            return GdbVariable.get_ul_for_var_with_children(this.props.expression, this.props.obj, this.props.expr_type, is_root)
        }else{
            return GdbVariable.get_ul_for_var_without_children(this.props.expression, this.props.obj, this.props.expr_type, is_root)
        }
    }
    /**
     * get unordered list for a variable that has children
     * @return unordered list, expanded or collapsed based on the key "show_children_in_ui"
     */
    static get_ul_for_var_with_children(expression, mi_obj, expr_type, is_root=false){
        let child_tree
        if(mi_obj.show_children_in_ui){

            let content
            if(mi_obj.children.length > 0){
                content = []
                for(let child of mi_obj.children){
                    if(child.numchild > 0){
                        content.push(<li key={child.exp}>{GdbVariable.get_ul_for_var_with_children(child.exp, child, expr_type)}</li>)
                    }else{
                        content.push(<li key={child.exp}>{GdbVariable.get_ul_for_var_without_children(child.exp, child, expr_type)}</li>)
                    }
                }
            }else{
                <li>{constants.ANIMATED_REFRESH_ICON}</li>
            }

            child_tree = <ul key={mi_obj.exp}>{content}</ul>


        }else{
            child_tree = ''
        }

        let plus_or_minus = mi_obj.show_children_in_ui ? '-' : '+'
        return GdbVariable._get_ul_for_var(expression, mi_obj, expr_type, is_root, plus_or_minus, child_tree, mi_obj.numchild)
    }
    static get_ul_for_var_without_children(expression, mi_obj, expr_type, is_root=false){
        return GdbVariable._get_ul_for_var(expression, mi_obj, expr_type, is_root)
    }
    /**
     * Get ul for a variable with or without children
     */
    static _get_ul_for_var(expression, mi_obj, is_root, expr_type, plus_or_minus='', child_tree='', numchild=0){
        let
            delete_button = is_root ? <span className='glyphicon glyphicon-trash pointer' onClick={()=>GdbVariable.click_delete_gdb_variable(mi_obj.name)}/> : ''
            , tree = numchild > 0 ? <span className='glyphicon glyphicon-tree-deciduous pointer' onClick={()=>GdbVariable.click_draw_tree_gdb_variable(mi_obj.name)} /> : ''
            , toggle_classes = numchild > 0 ? 'pointer' : ''
            , val = _.isString(mi_obj.value) ? Memory.make_addrs_into_links_react(mi_obj.value) : mi_obj.value
            , plot_content = ''
            , plot_button = ''
            ,plusminus_click_callback = numchild > 0 ? () => GdbVariable.click_toggle_children_visibility(expression) : ()=>{}

        if(mi_obj.can_plot && mi_obj.show_plot){
            // dots are not allowed in the dom as id's. replace with '-'.
            let id = mi_obj.dom_id_for_plot
            plot_button = <span className='pointer glyphicon glyphicon-ban-circle' onClick={()=>GdbVariable.click_toggle_plot(mi_obj.name)} title='remove plot'></span>
            plot_content = <div id={id} className='plot' />

        }else if(mi_obj.can_plot && !mi_obj.show_plot){
            plot_button = <img src='/static/images/ploticon.png' className='pointer' onClick={()=>GdbVariable.click_toggle_plot(mi_obj.name)} />
        }

        return <ul key={expression} className='variable'>
            <li>
                <span className={toggle_classes} onClick={plusminus_click_callback} data-gdb_variable_name={mi_obj.name}>
                    {plus_or_minus} {expression}:
                </span>

                {val}

                <span className='var_type'>
                    {Util.escape(mi_obj.type || '')}
                </span>


                <div className='right_help_icon_show_on_hover'>
                    {tree}
                    {plot_button}
                    {delete_button}
                </div>

                {plot_content}

            </li>
            {child_tree}
        </ul>
    }
    /**
     * Create a new variable in gdb. gdb automatically assigns
     * a unique variable name.
     */
    static create_variable(expression, expr_type){
        store.set('expr_being_created', expression)
        store.set('expr_type', expr_type)

        // - means auto assign variable name in gdb
        // * means evaluate it at the current frame
        if(expression.length > 0 && expression.indexOf('"') !== 0){
            expression = '"' + expression + '"'
        }
        let cmds = []
        if(store.get('pretty_print')){
            cmds.push('-enable-pretty-printing')
        }

        let var_create_cmd = `-var-create - * ${expression}`
        if(expr_type === 'hover'){
            var_create_cmd = constants.IGNORE_ERRORS_TOKEN_STR + var_create_cmd
        }
        cmds.push(var_create_cmd)

        GdbApi.run_gdb_command(cmds)
    }
    /**
     * gdb returns objects for its variables,, but before we save that
     * data locally, we will add more fields to make it more useful for gdbgui
     * @param obj (object): mi object returned from gdb
     * @param expr_type (str): type of expression being created (see store creation for documentation)
     */
    static prepare_gdb_obj_for_storage(obj){
        let new_obj = $.extend(true, {}, obj)
        // obj was copied, now add some additional fields used by gdbgui

        // A varobj's contents may be provided by a Python-based pretty-printer.
        // In this case the varobj is known as a dynamic varobj.
        // Dynamic varobjs have slightly different semantics in some cases.
        // https://sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI-Variable-Objects.html#GDB_002fMI-Variable-Objects
        new_obj.numchild = obj.dynamic ? parseInt(obj.has_more) : parseInt(obj.numchild)
        new_obj.children = []  // actual child objects are fetched dynamically when the user requests them
        new_obj.show_children_in_ui = false

        // this field is not returned when the variable is created, but
        // it is returned when the variables are updated
        // it is returned by gdb mi as a string, and we assume it starts out in scope
        new_obj.in_scope = 'true'
        new_obj.expr_type = store.get('expr_type')

        // can only be plotted if: value is an expression (not a local), and value is numeric
        new_obj.can_plot = (new_obj.expr_type === 'expr') && !window.isNaN(parseFloat(new_obj.value))
        new_obj.dom_id_for_plot = new_obj.name
            .replace(/\./g, '-')  // replace '.' with '-'
            .replace(/\$/g, '_')  // replace '$' with '-'
            .replace(/\[/g, '_')  // replace '[' with '_'
            .replace(/\]/g, '_')  // replace ']' with '_'
        new_obj.show_plot = false  // used when rendering to decide whether to show plot or not
        // push to this array each time a new value is assigned if value is numeric.
        // Plots use this data
        if(new_obj.value.indexOf('0x') === 0){
            new_obj.values = [parseInt(new_obj.value, 16)]
        }else if (!window.isNaN(parseFloat(new_obj.value))){
            new_obj.values = [new_obj.value]
        }else{
            new_obj.values = []
        }
        return new_obj
    }
    /**
     * After a variable is created, we need to link the gdb
     * variable name (which is automatically created by gdb),
     * and the expression the user wanted to evailuate. The
     * new variable is saved locally. The variable UI element is then re-rendered
     * @param r (object): gdb mi object
     */
    static gdb_created_root_variable(r){
        let expr = store.get('expr_being_created')
        if(expr){
            // example payload:
            // "payload": {
            //      "has_more": "0",
            //      "name": "var2",
            //      "numchild": "0",
            //      "thread-id": "1",
            //      "type": "int",
            //      "value": "0"
            //  },
            GdbVariable.save_new_expression(expr, store.get('expr_type'), r.payload)
            store.set('expr_being_created', null)
            // automatically fetch first level of children for root variables
            GdbVariable.fetch_and_show_children_for_var(r.payload.name)
        }else{
            console.error('Developer error: gdb created a variable, but gdbgui did not expect it to.')
        }
    }
    /**
     * Got data regarding children of a gdb variable. It could be an immediate child, or grandchild, etc.
     * This method stores this child array data to the appropriate locally stored
     * object
     * @param r (object): gdb mi object
     */
    static gdb_created_children_variables(r){
        // example reponse payload:
        // "payload": {
        //         "has_more": "0",
        //         "numchild": "2",
        //         "children": [
        //             {
        //                 "name": "var9.a",
        //                 "thread-id": "1",
        //                 "numchild": "0",
        //                 "value": "4195840",
        //                 "exp": "a",
        //                 "type": "int"
        //             }
        //             {
        //                 "name": "var9.b",
        //                 "thread-id": "1",
        //                 "numchild": "0",
        //                 "value": "0",
        //                 "exp": "b",
        //                 "type": "float"
        //             }
        //         ]
        //     }

        let parent_name = store.get('expr_gdb_parent_var_currently_fetching_children')

        store.set('expr_gdb_parent_var_currently_fetching_children', null)

        // get the parent object of these children
        let expressions = store.get('expressions')
        let parent_obj = GdbVariable.get_obj_from_gdb_var_name(expressions, parent_name)
        if(parent_obj){
            // prepare all the child objects we received for local storage
            let children = r.payload.children.map(child_obj => GdbVariable.prepare_gdb_obj_for_storage(child_obj))
            // save these children as a field to their parent
            parent_obj.children = children
            parent_obj.numchild = children.length
            store.set('expressions', expressions)
        }else{
            console.error('Developer error: gdb created a variable, but gdbgui did not expect it to.')
        }

        // if this field is an anonymous struct, the user will want to
        // see this expanded by default
        for(let child of parent_obj.children){
            if (child.exp.includes('anonymous')){
                GdbVariable.fetch_and_show_children_for_var(child.name)
            }
        }
    }
    /**
     * function render a plot on an existing element
     * @param obj: object to make a plot for
     */
    static _make_plot(obj){
        let id = '#' + obj.dom_id_for_plot  // this div should have been created already
        , jq = $(id)
        , data = []
        , i = 0

        // collect data
        for(let val of obj.values){
            data.push([i, val])
            i++
        }

        // make the plot
        $.plot(jq,
            [
                {data: data,
                shadowSize: 0,
                color: '#33cdff'}
            ],
            {
                series: {
                    lines: { show: true },
                    points: { show: true }
                },
                grid: { hoverable: true, clickable: false }
            }
        )

        // add hover event to show tooltip
        jq.bind('plothover', function (event, pos, item) {
            if (item) {
                let x = item.datapoint[0]
                , y = item.datapoint[1]

                $('#tooltip').html(`(${x}, ${y})`)
                    .css({top: item.pageY+5, left: item.pageX+5})
                    .show()
            } else {
                $("#tooltip").hide();
            }
        })
    }
    /**
     * look through all expression objects and see if they are supposed to show their plot.
     * If so, update the dom accordingly
     * @param obj: expression object to plot (may have children to plot too)
     */
    static plot_var_and_children(obj){
        if(obj.show_plot){
            GdbVariable._make_plot(obj)
        }
        for(let child of obj.children){
            GdbVariable.plot_var_and_children(child)
        }
    }
    static fetch_and_show_children_for_var(gdb_var_name){
        let expressions = store.get('expressions')
        let obj = GdbVariable.get_obj_from_gdb_var_name(expressions, gdb_var_name)
        // mutate object by reference
        obj.show_children_in_ui = true
        // update store
        store.set('expressions', expressions)
        if((obj.numchild) && obj.children.length === 0){
            // need to fetch child data
            GdbVariable._get_children_for_var(gdb_var_name, obj.expr_type)
        }else{
            // already have child data, re-render will occur from event dispatch
        }
    }
    static hide_children_in_ui(gdb_var_name){
        let expressions = store.get('expressions')
        , obj = GdbVariable.get_obj_from_gdb_var_name(expressions, gdb_var_name)
        if(obj){
            obj.show_children_in_ui = false
            store.set('expressions', expressions)
        }
    }
    static click_toggle_children_visibility(gdb_variable_name){
        GdbVariable._toggle_children_visibility(gdb_variable_name)
    }
    static _toggle_children_visibility(gdb_var_name){
        // get data object, which has field that says whether its expanded or not
        let obj = GdbVariable.get_obj_from_gdb_var_name(store.get('expressions'), gdb_var_name)
        if(obj){
            let showing_children_in_ui = obj.show_children_in_ui

            if(showing_children_in_ui){
                // collapse
                GdbVariable.hide_children_in_ui(gdb_var_name)
            }else{
                // expand
                GdbVariable.fetch_and_show_children_for_var(gdb_var_name)
            }
        }
    }
    static click_toggle_plot(gdb_var_name){
        let expressions = store.get('expressions')
        // get data object, which has field that says whether its expanded or not
        , obj = GdbVariable.get_obj_from_gdb_var_name(expressions, gdb_var_name)
        if(obj){
            obj.show_plot = !obj.show_plot
            store.set('expressions', expressions)
        }
    }
    /**
     * Send command to gdb to give us all the children and values
     * for a gdb variable. Note that the gdb variable itself may be a child.
     */
    static _get_children_for_var(gdb_variable_name, expr_type){
        store.set('expr_gdb_parent_var_currently_fetching_children', gdb_variable_name)
        store.set('expr_type', expr_type)
        GdbApi.run_gdb_command(`-var-list-children --all-values "${gdb_variable_name}"`)
    }
    static get_update_cmds(){
        function _get_cmds_for_obj(obj){
            let cmds = [`-var-update --all-values ${obj.name}`]
            for(let child of obj.children){
                cmds = cmds.concat(_get_cmds_for_obj(child))
            }
            return cmds
        }

        let cmds = []
        for(let obj of store.get('expressions')){
            cmds = cmds.concat(_get_cmds_for_obj(obj))
        }
        return cmds
    }
    static handle_changelist(changelist_array){
        for(let changelist of changelist_array){
            let expressions = store.get('expressions')
            , obj = GdbVariable.get_obj_from_gdb_var_name(expressions, changelist.name)
            if(obj){
                if(parseInt(changelist['has_more']) === 1 && 'name' in changelist){
                    // already retrieved children of obj, but more fields were added.
                    // Re-fetch the object from gdb
                    GdbVariable._get_children_for_var(changelist['name'], obj.expr_type)
                }
                if('new_children' in changelist){
                    let new_children = changelist.new_children.map(child_obj => GdbVariable.prepare_gdb_obj_for_storage(child_obj))
                    obj.children = obj.children.concat(new_children)
                }
                if('value' in changelist && obj.expr_type === 'expr'){
                    // this object is an expression and it had a value updated.
                    // save the value to an array for plotting
                    if(changelist.value.indexOf('0x') === 0){
                        obj.can_plot = true
                        obj.values.push(parseInt(changelist.value, 16))
                    }else if (!window.isNaN(parseFloat(changelist.value))){
                        obj.can_plot = true
                        obj.values.push(changelist.value)
                    }
                }
                // overwrite fields of obj with fields from changelist
                _.assign(obj, changelist)
                // update expressions array which will trigger and event, which will
                // cause components to re-render
                store.set('expressions', expressions)
            }else{
                // error
            }
        }
    }
    static click_delete_gdb_variable(gdb_variable){
        GdbVariable.delete_gdb_variable(gdb_variable)
    }
    static click_draw_tree_gdb_variable(gdb_variable){
        store.set('root_gdb_tree_var', gdb_variable)
    }
    static delete_gdb_variable(gdbvar){
        // delete locally
        GdbVariable._delete_local_gdb_var_data(gdbvar)
        // delete in gdb too
        GdbApi.run_gdb_command(`-var-delete ${gdbvar}`)
    }
    /**
     * Delete local copy of gdb variable (all its children are deleted too
     * since they are stored as fields in the object)
     */
    static _delete_local_gdb_var_data(gdb_var_name){
        let expressions = store.get('expressions')
        _.remove(expressions, v => v.name === gdb_var_name)
        store.set('expressions', expressions)
    }
    /**
     * Locally save the variable to our cached variables
     */
    static save_new_expression(expression, expr_type, obj){
        let new_obj = GdbVariable.prepare_gdb_obj_for_storage(obj)
        new_obj.expression = expression
        let expressions = store.get('expressions')
        expressions.push(new_obj)
        store.set('expressions', expressions)
    }
    /**
     * Get child variable with a particular name
     */
    static get_child_with_name(children, name){
        for(let child of children){
            if(child.name === name){
                return child
            }
        }
        return undefined
    }
    static get_root_name_from_gdbvar_name(gdb_var_name){
        return gdb_var_name.split('.')[0]
    }
    static get_child_names_from_gdbvar_name(gdb_var_name){
        return gdb_var_name.split('.').slice(1, gdb_var_name.length)
    }
    /**
     * Get object from gdb variable name. gdb variable names are unique, and don't match
     * the expression being evaluated. If drilling down into fields of structures, the
     * gdb variable name has dot notation, such as 'var.field1.field2'.
     * @param gdb_var_name: gdb variable name to find corresponding cached object. Can have dot notation
     * @return: object if found, or undefined if not found
     */
    static get_obj_from_gdb_var_name(expressions, gdb_var_name){
        // gdb provides names in dot notation
        // let gdb_var_names = gdb_var_name.split('.'),
        let top_level_var_name = GdbVariable.get_root_name_from_gdbvar_name(gdb_var_name),
            children_names = GdbVariable.get_child_names_from_gdbvar_name(gdb_var_name)

        let objs = expressions.filter(v => v.name === top_level_var_name)

        if(objs.length === 1){
            // we found our top level object
            let obj = objs[0]
            let name_to_find = top_level_var_name
            for(let i = 0; i < (children_names.length); i++){
                // append the '.' and field name to find as a child of the object we're looking at
                name_to_find += `.${children_names[i]}`

                let child_obj = GdbVariable.get_child_with_name(obj.children, name_to_find)

                if(child_obj){
                    // our new object to search is this child
                    obj = child_obj
                }else{
                    console.error(`could not find ${name_to_find}`)
                    return undefined
                }
            }
            return obj

        }else if (objs.length === 0){
            return undefined
        }else{
            console.error(`Somehow found multiple local gdb variables with the name ${top_level_var_name}. Not using any of them. File a bug report with the developer.`)
            return undefined
        }
    }
}


export default GdbVariable

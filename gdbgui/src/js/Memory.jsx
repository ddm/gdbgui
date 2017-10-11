import {store} from './store.js';
import GdbApi from './GdbApi.js';
import constants from './constants.js'
import MemoryLink from './MemoryLink.jsx';
import ReactTable from './ReactTable.jsx';
import React from 'react';

// class MemoryRow extends React.Component {
//     render(){

//     }
// }

/**
 * The Memory component allows the user to view
 * data stored at memory locations
 */
class Memory extends React.Component {
    static el_start = document.getElementById('memory_start_address')
    static el_end = document.getElementById('memory_end_address')
    static el_bytes_per_line = document.getElementById('memory_bytes_per_line')
    static MAX_ADDRESS_DELTA_BYTES = 1000
    static DEFAULT_ADDRESS_DELTA_BYTES = 31
    static DEFAULT_BYTES_PER_LINE = 31

    constructor() {
        super()
        this.state = store._store
        store.subscribe(this._store_change_callback.bind(this))

        Memory.el_start.onkeyup = Memory.keyup_in_memory_inputs
        Memory.el_end.onkeyup = Memory.keyup_in_memory_inputs
        Memory.el_bytes_per_line.onkeyup = Memory.keyup_in_memory_inputs
    }

    _store_change_callback(){
        this.setState(store._store)
    }

    /**
     * Internal render function. Not called directly to avoid wasting DOM cycles
     * when memory is being received from gdb at a high rate.
     */
    render(){
        if(Object.keys(store.get('memory_cache')).length === 0){
            return <span key='nothing' className='placeholder'>no memory to display</span>
        }

        let data = []
        , hex_vals_for_this_addr = []
        , char_vals_for_this_addr = []
        , i = 0
        , hex_addr_to_display = null

        let bytes_per_line = (parseInt(store.get('bytes_per_line'))) || Memory.DEFAULT_BYTES_PER_LINE
        bytes_per_line = Math.max(bytes_per_line, 1)

        data.push([<span key='moretop' className='pointer' style={{fontStyle: 'italic', fontSize: '0.8em'}} onClick={Memory.click_read_preceding_memory}>more</span>,
                    '',
                    '']
        )

        for (let hex_addr in store.get('memory_cache')){
            if(!hex_addr_to_display){
                hex_addr_to_display = hex_addr
            }

            if(i % (bytes_per_line) === 0 && hex_vals_for_this_addr.length > 0){
                // begin new row
                data.push(
                    [Memory.make_addrs_into_links_react(hex_addr_to_display),
                    hex_vals_for_this_addr.join(' '),
                    char_vals_for_this_addr])

                // update which address we're collecting values for
                i = 0
                hex_addr_to_display = hex_addr
                hex_vals_for_this_addr = []
                char_vals_for_this_addr = []

            }
            let hex_value = store.get('memory_cache')[hex_addr]
            hex_vals_for_this_addr.push(hex_value)
            let char = String.fromCharCode(parseInt(hex_value, 16)).replace(/\W/g, '.')
            char_vals_for_this_addr.push(<span key={i} className='memory_char'>{char}</span>)
            i++

        }

        if(hex_vals_for_this_addr.length > 0){
            // memory range requested wasn't divisible by bytes per line
            // add the remaining memory
            data.push([Memory.make_addrs_into_links_react(hex_addr_to_display),
                    hex_vals_for_this_addr.join(' '),
                    char_vals_for_this_addr])

        }

        if(Object.keys(store.get('memory_cache')).length > 0){
            data.push([<span key='morebottom' className='pointer' style={{fontStyle: 'italic', fontSize: '0.8em'}} onClick={Memory.click_read_more_memory}>more</span>,
                        '',
                        '']
            )
        }

        return  <div>
                    <ReactTable data={data} header={['address', 'hex' , 'char']} />
                </div>
    }

    static keyup_in_memory_inputs(e){
        if (e.keyCode === constants.ENTER_BUTTON_NUM){
            store.set('start_addr', Memory.el_start.value)
            store.set('end_addr', Memory.el_end.value)
            store.set('bytes_per_line', parseInt(Memory.el_bytes_per_line.value))
            Memory.fetch_memory_from_state()
        }
    }

    static click_memory_address(e){
        e.stopPropagation()
        let addr = e.currentTarget.dataset['memadr']
        Memory.set_inputs_from_address(addr)
    }

    static set_inputs_from_address(addr){
        // set inputs in DOM
        store.set('start_addr', '0x' + (parseInt(addr, 16)).toString(16),)
        store.set('end_addr', '0x' + (parseInt(addr,16) + Memory.DEFAULT_ADDRESS_DELTA_BYTES).toString(16))
        Memory.el_start.value = store.get('start_addr')
        Memory.el_end.value = store.get('end_addr')
        Memory.el_bytes_per_line.value = store.get('bytes_per_line')
        // fetch memory from whatever's in DOM
        Memory.fetch_memory_from_state()
    }

    static get_gdb_commands_from_state(){
        let start_addr = parseInt(_.trim(store.get('start_addr')), 16),
            end_addr = parseInt(_.trim(store.get('end_addr')), 16)

        if(!window.isNaN(start_addr) && window.isNaN(end_addr)){
            end_addr = start_addr + Memory.DEFAULT_ADDRESS_DELTA_BYTES
        }

        let cmds = []
        if(_.isInteger(start_addr) && end_addr){
            if(start_addr > end_addr){
                end_addr = start_addr + Memory.DEFAULT_ADDRESS_DELTA_BYTES
                store.set('end_addr', '0x' + end_addr.toString(16))

            }else if((end_addr - start_addr) > Memory.MAX_ADDRESS_DELTA_BYTES){
                end_addr = start_addr + Memory.MAX_ADDRESS_DELTA_BYTES
                store.set('end_addr', '0x' + end_addr.toString(16))
            }

            let cur_addr = start_addr
            while(cur_addr <= end_addr){
                // TODO read more than 1 byte at a time?
                cmds.push(`-data-read-memory-bytes ${'0x' + cur_addr.toString(16)} 1`)
                cur_addr = cur_addr + 1
            }
        }

        if(!window.isNaN(start_addr)){
            store.set('start_addr', '0x' + start_addr.toString(16))
        }
        if(!window.isNaN(end_addr)){
            store.set('end_addr', '0x' + end_addr.toString(16))
        }

        return cmds
    }

    static fetch_memory_from_state(){
        let cmds = Memory.get_gdb_commands_from_state()
        Memory.clear_cache()
        GdbApi.run_gdb_command(cmds)
    }

    static click_read_preceding_memory(){
        // update starting value, then re-fetch
        let NUM_ROWS = 3
        let start_addr = parseInt(_.trim(store.get('start_addr')), 16)
        , byte_offset = store.get('bytes_per_line') * NUM_ROWS
        store.set('start_addr', '0x' + (start_addr - byte_offset).toString(16))
        Memory.fetch_memory_from_state()
    }

    static click_read_more_memory(){
        // update ending value, then re-fetch
        let NUM_ROWS = 3
        let end_addr = parseInt(_.trim(store.get('end_addr')), 16)
        , byte_offset = store.get('bytes_per_line') * NUM_ROWS
        store.set('end_addr', '0x' + (end_addr + byte_offset).toString(16))
        Memory.fetch_memory_from_state()
    }

    static _make_addr_into_link(addr, name=addr){
        let _addr = addr
            , _name = name
        return `<a class='pointer memadr' data-memadr='${_addr}'>${_name}</a>`
    }

    static _make_addr_into_link_react(addr, name=addr){
        void(React)
        return (<MemoryLink display_text={name} addr={addr} />)
    }

    /**
     * @param text: string to convert address-like text into clickable components
     * return react component
     */
    static make_addrs_into_links_react(text){
        let matches = text.match(/(0x[\d\w]+)/g)
        if (text && matches && matches.length){
            let addr = matches[0]
            let leading_text = text.slice(0, text.indexOf(addr))
            let component = Memory._make_addr_into_link_react(addr)
            let trailing_text = text.slice(text.indexOf(addr) + addr.length, text.length)
            let suffix_component = trailing_text
            if(trailing_text){
                // recursive call to turn additional addressed after the first
                suffix_component = Memory.make_addrs_into_links_react(trailing_text)
            }
            return (<span>{leading_text}{component}{suffix_component}</span>)
        }else{
            return (<span>{text}</span>)
        }
    }

    static add_value_to_cache(hex_str, hex_val){
        // strip leading zeros off address provided by gdb
        // i.e. 0x000123 turns to
        // 0x123
        let hex_str_truncated = '0x' + (parseInt(hex_str, 16)).toString(16)
        let cache = store.get('memory_cache')
        cache[hex_str_truncated] = hex_val
        store.set('memory_cache', cache)
    }

    static clear_cache(){
        store.set('memory_cache', {})
    }

}

export default Memory

'use strict';

export class MarkDownCmd {
    /**
     * generateMarkedCommandStr
     * @param name Name
     * @param command Command name
     * @param args Arguments
     * @param hint Hint for hover
     */
    public static generateMarkedCommandStr(name:string, command:string, args:object, hint:string){
        var str = `[${name}](command:${command}?` + encodeURIComponent(JSON.stringify(args));
        if(hint != null){
            str += ` "${hint}")`;
        } else {
            str += `)`;
        }
        return str;
    }


    /**
     * generateMarkedCommandPic
     * @param name Name
     * @param command Command
     * @param args Arguments
     * @param picLoc Picture location
     * @param hint Hint for hover
     */
    public static generateMarkedCommandPic(name:string, command:string, args:object, picLoc:string, hint:string){
        picLoc = 'https://github.com/mine2chow/JSON-Helper/raw/master/imgs/' + picLoc;
        var str = `[\`![${name}](${picLoc})\`](command:${command}?` + encodeURIComponent(JSON.stringify(args));
        if(hint != null){
            str += ` "${hint}")`;
        } else {
            str += `)`;
        }
        return str;
    }
}
import * as events from 'https://deno.land/std@0.93.0/node/events.ts'

const requiredPermissions: Deno.PermissionDescriptor = { name: 'read' };

if((await Deno.permissions.query(requiredPermissions)).state === 'prompt') Deno.permissions.request(requiredPermissions);
if((await Deno.permissions.query(requiredPermissions)).state === 'denied') throw new Error('FSWatcher requires read permission to function');

interface FSWatcher {
    on(event: 'modify', listener: (filepath: string, previousStats: Deno.FileInfo, currentStats: Deno.FileInfo) => void): this;
}

class FSWatcher extends events.EventEmitter {
    private _intervalID: number;
    private _watchers: Array<FSWatcher> = new Array;
    private _prevStats: Deno.FileInfo | null = null;
    private static _isStatsEqual(stats1: Deno.FileInfo | null, stats2: Deno.FileInfo | null): boolean {
        if(stats1 === null || stats2 === null) return false;
        if(stats1.mtime?.valueOf() !== stats2.mtime?.valueOf()) return false;
        if(stats1.size !== stats2.size) return false;
        if(stats1.atime?.valueOf() !== stats2.atime?.valueOf()) return false;
        if(stats1.birthtime?.valueOf() !== stats2.birthtime?.valueOf()) return false;
        if(stats1.blksize !== stats2.blksize) return false;
        if(stats1.blocks !== stats2.blocks) return false;
        if(stats1.dev !== stats2.dev) return false;
        if(stats1.gid !== stats2.gid) return false;
        if(stats1.ino !== stats2.ino) return false;
        if(stats1.isDirectory !== stats2.isDirectory) return false;
        if(stats1.isFile !== stats2.isFile) return false;
        if(stats1.isSymlink !== stats2.isSymlink) return false;
        if(stats1.mode !== stats2.mode) return false;
        if(stats1.nlink !== stats2.nlink) return false;
        if(stats1.rdev !== stats2.rdev) return false;
        if(stats1.uid !== stats2.uid) return false;
        return true;
    }
    constructor(filepath: string, pollingRate: number = 100) {
        super();        
        // Crashes whenever a file in the  directory is deleted. Works with individual files right now.

        // const stats = Deno.statSync(filepath);
        // if(stats.isDirectory) {
        //     const dir = Deno.readDirSync(filepath);
        //     for(const file of dir) {
        //         const watcher = new FSWatcher(filepath+'/'+file.name, pollingRate);
        //         this._watchers.push(watcher);
        //         watcher.on('modify', (path, prevStats, currStats) => {
        //             this.emit('modify', path, prevStats, currStats);
        //         })
        //     }
        //     this._intervalID = setInterval(() => {

        //     });
        //     return this;
        // }
        this._prevStats = Deno.statSync(filepath);
        this._intervalID = setInterval(() => {
            const newStats = Deno.statSync(filepath);
            if(!FSWatcher._isStatsEqual(newStats, this._prevStats)) this.emit('modify', filepath, this._prevStats, newStats);
            this._prevStats = newStats;
        }, pollingRate);
    }
    public delete(): void {
        for(const watcher of this._watchers) watcher.delete();
        clearInterval(this._intervalID);
    }
}

export default FSWatcher;
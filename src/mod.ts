import * as events from 'https://deno.land/std@0.93.0/node/events.ts';
import * as fs from 'https://deno.land/std@0.105.0/fs/mod.ts';

const requiredPermissions: Deno.PermissionDescriptor = { name: 'read' };

if((await Deno.permissions.query(requiredPermissions)).state === 'prompt') Deno.permissions.request(requiredPermissions);
if((await Deno.permissions.query(requiredPermissions)).state === 'denied') throw new Error('FSWatcher requires read permission to function');

interface FSWatcher {
    on(event: 'modify', listener: (filepath: string, previousStats: Deno.FileInfo, currentStats: Deno.FileInfo) => void): this;
}

class FSWatcher extends events.EventEmitter {
    private _path: string;
    private _parent: FSWatcher | null = null;
    private _watchers: Record<string,FSWatcher> = {};
    private _interval: number = 0;
    private _currentStats: Deno.FileInfo;
    constructor(filepath: string, pollingRate: number = 100, recursive = false, parent?: FSWatcher) {
        super();
        this._path = filepath;
        if(parent) this._parent = parent;
        if(!fs.existsSync(filepath)) throw new Error('File does not exist');
        this._currentStats = Deno.statSync(filepath);
        if(this._currentStats.isFile) {
            this._interval = setInterval(() => {
                if(!fs.existsSync(filepath)) return this.delete();
                const prev = this._currentStats;
                const curr = Deno.statSync(filepath);
                if(prev.mtime?.valueOf() !== curr.mtime?.valueOf()) this.emit('modify', filepath, prev, curr);
                this._currentStats = curr;
            }, pollingRate);
        }
        if(this._currentStats.isDirectory && (this._parent ? recursive : true)) {
            const dir = Array.from(Deno.readDirSync(filepath));
            this._watchers = Object.fromEntries(dir.map(v => {
                const watcher = new FSWatcher(filepath+'/'+v.name, pollingRate, recursive, this);
                watcher.on('modify', (filepath, prev, curr) => this.emit('modify', filepath, prev, curr));
                return [filepath+'/'+v.name, watcher];
            }));
            this._interval = setInterval(() => {
                if(!fs.existsSync(filepath)) return this.delete();
                const dir = Array.from(Deno.readDirSync(filepath)).map(v => v.name);
                for(const newFile of dir.filter(v => this._watchers[filepath+'/'+v] === undefined)) {
                    const watcher = new FSWatcher(filepath+'/'+newFile, pollingRate, recursive, this);
                    this._watchers[filepath+'/'+newFile] = watcher;
                    watcher.on('modify', (filepath, prev, curr) => this.emit('modify', filepath, prev, curr));
                }
            }, pollingRate);
        }
    }
    public delete(): void {
        clearInterval(this._interval);
        if(this._parent) delete this._parent?._watchers[this._path];
        for(const watcher of Object.values(this._watchers)) watcher.delete();
    }
}

export default FSWatcher;
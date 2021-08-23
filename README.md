# FSWatcher
A simple event listener to listen for changes for the file system. Requires Deno read permissions to function. Has an option to recursively watch files in whole directories if you're into that.

## Import
```ts
import FSWatcher from 'https://deno.land/x/fswatcher@v0.1/mod.ts'
```

## Usage
Instantiate a new instance of FSWatch with the file path provided with a specified polling rate in milliseconds. You can listen to the 'modify' event to operate on changed data. The first argument of the modify event is the path of the specified file, the second is the previous stats that file had before the modification, and the third is the stats it has after the modification. For append only files you can chunk the read buffer at the end by the difference between the file sizes.
```ts
import FSWatcher from 'https://deno.land/x/fswatcher@v0.1/mod.ts'

// Every second it polls this file's stats and console logs it.
const watcher = new FSWatcher('./file.log', 1000);
watcher.on('modify', (file, prev, curr) => {
    const newData = Deno.readFileSync(file).slice(prev.size);
    console.log(newData);
});
```

## Robustness
FSWatcher will catch new files and remove old ones from it's watch list when targeting a directory. It should not crash (I hope) when a file goes missing or a new file appears. If you run into issues, please open an issue.

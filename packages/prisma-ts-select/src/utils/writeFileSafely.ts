import fs from 'node:fs'
import path from 'node:path'

export function writeFileSafely(writeLocation: string, content: any) {
    fs.mkdirSync(path.dirname(writeLocation), {
        recursive: true,
    })

    fs.writeFileSync(writeLocation, content);
}

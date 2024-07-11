Things of note!!!!

- remove typeof from 
  - `type _db = DeepWriteable<typeof DB>;`
  - `}[keyof typeof DB];`
- Merge Items missing //@ts-expect-error - might not be needed
- groupBy -> having, 
  - missing @deprecated
  - ts-exptect-error  - might not be needed
- GetColsFromTableType missing ts-expect-error - might not be needed
- DB needs to be in the same file.



# prisma-ts-select

## Install

```shell
npm i prisma-ts-select
pnpm add prisma-ts-select
```

## Setup

### Extract
```typescript
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);
```

### Generator
```prisma

generator prisma-ts-select {
  provider = "prisma-ts-select"
}

```

## Usage

```typescript
async function main() {
    const results = await prisma.$from("<table>")
        .select("<column>")
        .run()
  console.log(results);
}
```

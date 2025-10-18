import tsSelectExtend from 'prisma-ts-select/extend'
import {PrismaClient, Prisma} from "@prisma/client";

const prisma = new PrismaClient({}).$extends(tsSelectExtend);

console.log(prisma.$from("User")
    .join("Post", "authorId", "User.id")
    .where({
        "User.name": {
            "op": "IN",
            values: ["A"]
        },
        "Post.published": true,
        OR: [{
            "Post.title": {
                "op": "LIKE",
                "value": "%typescript%"
            },
            "Post.content": {
                "op": "LIKE",
                "value": "%typescript%"
            },
        }]
    })
    .limit(1)
    .offset(1)
    .getSQL());

let userName = "hello";
const sql = Prisma.sql`${userName ? Prisma.sql`WHERE name = ${userName}` : Prisma.empty}`
console.log(sql.statement)

import { describe, it, before } from "node:test"
import assert from "node:assert"

import { PrismaClient } from "@prisma/client";
import { DbSelect } from "../src/db-select.js"
import type { Equal, Expect} from "./utils.js";
import { typeCheck} from "./utils.js";


const prisma = new PrismaClient({
    log: ['query']
})
//
const db = new DbSelect(prisma);


describe("basic select", () => {

    before(()=> {
        /*TODO insert data into DB*/
    });
    function createQuery(){
        return db.from("User")
            .select("*");
    }

    it("RUN: select * from", async () =>  {
        const result =  await createQuery().run();

        typeCheck({} as Expect<Equal<typeof result, Array<{id: number; email: string; name: string | null}>>>);


        assert.deepEqual(result, [
            {
                id: 1,
                email: 'johndoe@example.com',
                name: 'John Doe',
            },
            {
                id: 2,
                email: 'smith@example.com',
                name: 'John Smith',
            }
        ]);

    });

    it("SQL: select * from ", () => {
        const sql = createQuery().getSQL();
        assert.deepStrictEqual(sql, `select * from User;`)
    });
});

describe("basic select with join", () => {

    before(()=> {
        /*TODO insert data into DB*/
    });
    function createQuery(){
        return db.from("User")
            .join("Post", "authorId", "User.id")
            .select("*");
    }

    it("should run", async () =>  {
        const result =  await createQuery().run();

        typeCheck({} as Expect<Equal<typeof result, Array<{
            id: number;
            email: string;
            name: string | null;
            title: string;
            content: string;
            published: boolean;
            authorId: number;
        }>>>);


        assert.deepStrictEqual(result,  [
            { id: 1, email: 'johndoe@example.com', name: 'John Doe', title: 'Blog 1', content: 'Something', published: false, authorId: 1 },
            { id: 2, email: 'johndoe@example.com', name: 'John Doe', title: 'blog 2', content: 'sql', published: false, authorId: 1 },
            { id: 1, email: 'smith@example.com', name: 'John Smith', title: 'Blog 1', content: 'Something', published: false, authorId: 1 },
            { id: 2, email: 'smith@example.com', name: 'John Smith', title: 'blog 2', content: 'sql', published: false, authorId: 1 } ]);

    });

    it("should match SQL", () => {
        const sql = createQuery().getSQL();
        assert.strictEqual(sql, `select * from User join Post authorId on User.id;`)
    });
})

// describe("basic select with join", () => {
//
//     before(()=> {
//         /*TODO insert data into DB*/
//     });
//     function createQuery(){
//         return db.from("User")
//             .join("Posts", "authorId", "id")
//             .select("*");
//     }
//
//     it("RUN: select * from join", async () =>  {
//         const r5 =  await createQuery().run();
//
//         assert.strictEqual(r5, [
//             {
//                 id: 1,
//                 email: 'johndoe@example.com',
//                 name: 'John Doe',
//                 title: 'Blog 1',
//                 content: 'Something',
//                 published: false,
//                 authorId: 1
//             },
//             {
//                 id: 2,
//                 email: 'johndoe@example.com',
//                 name: 'John Doe',
//                 title: 'blog 2',
//                 content: 'sql',
//                 published: false,
//                 authorId: 1
//             }
//         ])
//     });
//
//     it("SQL: select * from ", () => {
//         const sql = createQuery().getSQL();
//         assert.strictEqual(sql, `select * from User Join Post authorId on User.id;`)
//     });
// })

// async function main() {
//
// //     console.log(await prisma.$queryRaw`SELECT user.id , user.name , post.id, post.title
// // FROM user
// // JOIN post  on authorId =  user.id;`);
// //
// //     console.log(await prisma.$queryRaw`SELECT User.id as \`User.id\`, User.name as \`User.name\`, Post.id as \`Post.id\`, Post.title as \`Post.title\`
// // FROM User
// // JOIN Post  on authorId =  User.id;`);
// //
// //     console.log(await prisma.$queryRaw`SELECT *
// // FROM User
// // JOIN Post  on authorId =  User.id;`);
//
//     //
// //     console.log("prisma.user.findMany",await prisma.user.findMany());
// //     // const r = await prisma.$queryRaw`SELECT * FROM user`;
// //
// //     //Region Able to join on anything
// //
// //     const r1 = await db.from("User")
// //         .joinUnsafeAllFields("Posts", "id", "")
// //         .select("*")
// //         .run();
// //     console.log(r1)
// //
// //     const r2 = await db.from("User")
// //         .joinUnsafeAllFields("Posts", "authorId", "")
// //         .joinUnsafeAllFields("PostsImages", "id", "")
// //         .select("*")
// //         .run();
// //
// //     console.log(r2)
// //
// //     //Region Able to on same types
// //
// //     const r3 = await db.from("User")
// //         .joinUnsafe("Posts", "id", "id")
// //         .select("*")
// //         .run();
// //     console.log(r3)
// //
// //     const r4 = await db.from("User")
// //         .joinUnsafe("Posts", "authorId", "id")
// //         .joinUnsafe("PostsImages", "id", "Posts.id")
// //         .select("*")
// //         .run();
// //
// //     console.log(r4)
// //
// //     //Region Joins are only allowed based on defined foreign keys
//     const r5 = await db.from("User")
//         .join("Posts", "authorId", "id")
//         .select("*")
//         .run();
//     console.log(r5)
//
//     const r6 = await db.from("User")
//         .join("Posts", "lastModifiedBy", "id")
//         .join("LikedPosts", "postId", "Posts.id")
//         .select("*")
//         .run();
//
//     console.log(r6)
// //
// //     const r7 = await db.from("User")
// //         .join("Posts", "lastModifiedBy", "id")
// //         .join("LikedPosts", "postId", "Posts.id")
// //         .groupBy()
// //         .having()
// //         .select("*")
// //         .run();
// //
// //     console.log(r7)
// //
// //     // const r = await db.from("platform_Snapshot_CDH")
// //     //     .join("platform_AccountProfile pAP", "platform_Snapshot_CDH.accountProfileId","pAP.id")
// //     //     .join("_platform_Actions_CDHToplatform_Snapshot_CDH pACTSC", "platform_Snapshot_CDH.id", "pACTSC.B")
// //     //     .join("platform_Actions_CDH pA", "pACTSC.A", "pA.id")
// //     //     .join("platform_Connectors_CDH pC", "pA.connectorId", "pC.id")
// //     //     .where("pAP.account", "=", "")
// //     //     .where("pAP.profile", "=", "")
// //     //     // .selectAllBut(["pAP.password"])
// //     //     .selectDistinct()
// //     //     .select("pC.uid", "connectorId")
// //     //     .select("pA.uid", "actionId")
// //     //     .select("pA.source", "type")
// //     //     .select("IFNULL",
// //     //         (tables) =>
// //     //             db(tables)
// //     //                 .from("platform_Audiences_CDH")
// //     //                 .where("pA.audienceId", "=", "platform_Audiences_CDH.id")
// //     //                 .select("uid"),
// //     //         (tables) =>
// //     //             db(tables)
// //     //                 .from("platform_EventFeeds_CDH")
// //     //                 .where("pA.feedId", "=", "platform_EventFeeds_CDH.id")
// //     //                 .select("uid"),
// //     //         "typeId")
// //     //     .run();
// //     //
// //     //
// //     //
// //     // const r7 = db.from("View_Platform_Profile vp")
// //     //     .innerJoin("platform_Snapshot snap", "snap.accountProfileId", "vp.snapshot_accountProfileId")
// //     //     // .innerJoin("_platform_EventsToplatform_Snapshot events_snap", "snap.id", "events_snap.B")
// //     //     .innerJoin("platform_Events_StdData events_std", "events.stdDataId", "events_std.id")
// //     //     .select("vp.account")
// //     //     .select("vp.profile")
// //     //     .select("events_std.eventType eventType")
// //     //     .select("COUNT(*) event_count_per_type")
// //     //     .groupBy("vp.account", "vp.profile", "events_std.eventType")
// //     //     .orderBy("event_type", "event_count_per_type DESC", "vp.account", "vp.profile")
// //     // console.log("SELECT * FROM user",r);
//
//
// }

// main()
//     .then(async () => {
//         await prisma.$disconnect()
//     })
//     .catch(async (e) => {
//         console.error(e)
//         await prisma.$disconnect()
//         process.exit(1)
//     })

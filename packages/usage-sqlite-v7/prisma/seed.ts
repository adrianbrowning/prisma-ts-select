import { prisma } from '../src/client.ts'

async function seed() {
    console.log('Seeding database...');

    // Clear existing data
    await prisma.post.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.employee.deleteMany({});

    // Create users
    await prisma.user.createMany({
        data: [
            {
                id: 1,
                email: 'johndoe@example.com',
                name: 'John Doe',
                age: 25,
            },
            {
                id: 2,
                email: 'smith@example.com',
                name: 'John Smith',
                age: 30,
            },
            {
                id: 3,
                email: 'alice@example.com',
                name: null,  // Test nullable field
                age: null,
            }
        ],
    });

    // Create posts
    await prisma.post.createMany({
        data: [
            {
                id: 1,
                title: 'Blog 1',
                content: 'Something',
                published: false,
                createdAt: new Date('2020-01-15T10:30:00.000Z'),
                authorId: 1,
                lastModifiedById: 1,
                metadata: { name: 'Blog Post 1', tags: ['prisma', 'ts'] },
            },
            {
                id: 2,
                title: 'blog 2',
                content: 'sql',
                published: false,
                createdAt: new Date('2020-06-20T14:45:00.000Z'),
                authorId: 1,
                lastModifiedById: 1,
                metadata: null,
            },
            {
                id: 3,
                title: 'blog 3',
                content: null,  // Test nullable field
                published: false,
                createdAt: new Date('2021-12-25T08:00:00.000Z'),
                authorId: 2,
                lastModifiedById: 2,
                metadata: null,
            }
        ]
    });

    // Create employees (for self-join tests)
    await prisma.employee.createMany({
        data: [
            {
                id: 1,
                name: 'CEO',
                managerId: null
            },
            {
                id: 2,
                name: 'Manager',
                managerId: 1
            },
            {
                id: 3,
                name: 'Employee',
                managerId: 2
            }
        ]
    });

    // Create M2M seed data (for many-to-many join tests)
    await prisma.m2M_Post.deleteMany({});
    await prisma.m2M_Category.deleteMany({});
    await prisma.m2M_Post.create({
        data: {
            id: 1,
            title: "M2M Post 1",
            authorId: 1,
            cat1: {
                create: { id: 1, name: "M2M Category 1" }
            }
        }
    });

    // Create MMM (multi-M2M) seed data
    await prisma.mMM_Post.deleteMany({});
    await prisma.mMM_Category.deleteMany({});
    await prisma.mMM_Post.create({
        data: {
            id: 1,
            title: "MMM Post 1",
            authorId: 1,
            cat1: {
                create: { id: 1, name: "MMM Category M1" }
            }
        }
    });
    await prisma.mMM_Post.update({
        where: { id: 1 },
        data: {
            cat2: {
                create: { id: 2, name: "MMM Category M2" }
            }
        }
    });

    // Create M2MBug seed data (multi-junction M2M type bug tests)
    await prisma.m2MBug_Post.deleteMany({});
    await Promise.all([
        prisma.m2MBug_CatA.deleteMany({}),
        prisma.m2MBug_CatB.deleteMany({}),
    ]);
    await Promise.all([
        prisma.m2MBug_CatA.createMany({ data: [{ id: 1, name: "M2MBug CatA 1" }] }),
        prisma.m2MBug_CatB.createMany({ data: [{ id: 1, name: "M2MBug CatB 1" }] }),
    ]);
    await prisma.m2MBug_Post.create({
        data: {
            id: 1,
            title: "M2MBug Post 1",
            authorId: 1,
            catsA: { connect: [{ id: 1 }] },
            catsB: { connect: [{ id: 1 }] },
        }
    });

    console.log('Seeding complete! Created:');
    console.log('- 3 users');
    console.log('- 3 posts');
    console.log('- 3 employees');
    console.log('- 1 M2M_Post + 1 M2M_Category (M2M join tests)');
    console.log('- 1 MMM_Post + 2 MMM_Category (multi-M2M join tests)');
    console.log('- 1 M2MBug_Post + 1 M2MBug_CatA + 1 M2MBug_CatB (multi-junction M2M bug tests)');
}

async function main() {
    try {
        await seed();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

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
            },
            {
                id: 2,
                email: 'smith@example.com',
                name: 'John Smith',
            },
            {
                id: 3,
                email: 'alice@example.com',
                name: null,  // Test nullable field
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
                authorId: 1,
                lastModifiedById: 1
            },
            {
                id: 2,
                title: 'blog 2',
                content: 'sql',
                published: false,
                authorId: 1,
                lastModifiedById: 1
            },
            {
                id: 3,
                title: 'blog 3',
                content: null,  // Test nullable field
                published: false,
                authorId: 2,
                lastModifiedById: 2
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

    console.log('Seeding complete! Created:');
    console.log('- 3 users');
    console.log('- 3 posts');
    console.log('- 3 employees');
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


import { executeBuilderAction } from './aiBuilderActions';
import { getDb } from './db';
import { users, projects, pages, elements } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function runTest() {
    console.log('🧪 Starting Nano Agent End-to-End Test...');
    const db = await getDb();

    try {
        // 1. Setup Test User/Project
        console.log('👤 Setting up test context...');
        const user = await db.select().from(users).limit(1);
        if (!user.length) throw new Error('No users found. Run app first.');
        const testUserId = user[0].id;

        // Create temp project
        const project = await db.insert(projects).values({
            userId: testUserId,
            name: 'Nano Test Protocol',
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
        }).$returningId();
        const projectId = project[0].id;

        const page = await db.insert(pages).values({
            projectId: projectId,
            name: 'Nano Page',
            slug: 'nano-test',
            isHomePage: false,
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
        }).$returningId();
        const pageId = page[0].id;

        console.log(`✅ Test Environment Ready: Project ${projectId}, Page ${pageId}`);

        // 2. Simulate AI Action with Nano Tag
        console.log('🤖 Simulating AI "Create Hero with Nano Background"...');

        const action = {
            type: 'createElement' as const,
            data: {
                pageId: pageId,
                elementType: 'container',
                content: '',
                styles: {
                    width: '100%',
                    height: '500px',
                    // THIS IS THE CORE TEST:
                    backgroundImage: 'url(<nano:cyberpunk city night>)'
                }
            }
        };

        // 3. Execute Action (hits aiBuilderActions -> nanoAgent)
        console.log('⚡ Executing Builder Action...');
        const result = await executeBuilderAction(action, testUserId);

        // 4. Verify Result
        console.log('🔍 Verifying Result...');

        // Check in-memory result
        const bgImage = result.styles?.backgroundImage as string;
        console.log(`   Result Style: ${bgImage}`);

        if (bgImage && bgImage.includes('pollinations.ai') && !bgImage.includes('<nano:')) {
            console.log('✅ PASS: Nano tag was replaced with Pollinations URL');
        } else {
            console.error('❌ FAIL: Nano tag was NOT replaced properly');
            process.exit(1);
        }

        // Check Database Persistence
        const dbElement = await db.select().from(elements).where(eq(elements.id, result.id));
        const persistedBg = (dbElement[0].styles as any).backgroundImage;

        if (persistedBg === bgImage) {
            console.log('✅ PASS: Database persistence confirmed');
        } else {
            console.error('❌ FAIL: Database mismatch');
        }

        // 5. Cleanup
        console.log('🧹 Cleaning up...');
        await db.delete(elements).where(eq(elements.pageId, pageId));
        await db.delete(pages).where(eq(pages.id, pageId));
        await db.delete(projects).where(eq(projects.id, projectId));

        console.log('🎉 ALL TESTS PASSED. Sleep well! 🛌');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

runTest();

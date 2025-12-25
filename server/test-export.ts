import 'dotenv/config';
import { getDb } from './db';
import { elements, pages } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { exportToYOOtheme } from './yoothemeExporter';

async function testExport() {
    console.log('Testing Export for Page 1...');
    const db = await getDb();

    // Get Page 1
    const pageResult = await db.select().from(pages).where(eq(pages.id, 1));
    const page = pageResult[0];

    if (!page) {
        console.error('Page 1 not found');
        process.exit(1);
    }

    // Get Elements for Page 1
    const pageElements = await db.select().from(elements)
        .where(eq(elements.pageId, 1))
        // @ts-ignore
        .orderBy(elements.order);

    console.log(`Found ${pageElements.length} elements.`);

    // Export
    const yoothemeJson = exportToYOOtheme(page, pageElements);

    console.log(JSON.stringify(yoothemeJson, null, 2));
    process.exit(0);
}

testExport().catch(console.error);

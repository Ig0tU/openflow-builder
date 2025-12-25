#!/usr/bin/env tsx
/**
 * Migration script to fix old absolute-positioned elements
 * Converts position: absolute elements to flow layout
 */

import { getDb } from './db';
import { elements } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function migrateLayouts() {
    console.log('Migrating element layouts from absolute to flow...');

    const db = await getDb();

    // Get all elements
    const allElements = await db.select().from(elements);

    let migratedCount = 0;

    for (const element of allElements) {
        const styles = element.styles as Record<string, string> || {};

        // Check if this element has absolute positioning
        if (styles.position === 'absolute') {
            // Remove absolute positioning properties
            const { position, top, left, ...restStyles } = styles;

            // Add flow layout properties
            const newStyles = {
                ...restStyles,
                display: restStyles.display || 'block',
                width: restStyles.width || '100%',
                marginBottom: restStyles.marginBottom || '16px',
                boxSizing: 'border-box',
            };

            // Update the element
            await db.update(elements).set({ styles: newStyles }).where(eq(elements.id, element.id));
            migratedCount++;
            console.log(`  Migrated element ${element.id} (${element.elementType})`);
        }
    }

    console.log(`\n✅ Migrated ${migratedCount} elements to flow layout`);
    process.exit(0);
}

migrateLayouts().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});

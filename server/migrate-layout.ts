#!/usr/bin/env tsx
/**
 * Migration script to fix old absolute-positioned elements
 * Converts position: absolute elements to flow layout
 */

import * as db from './db';

async function migrateLayouts() {
    console.log('Migrating element layouts from absolute to flow...');

    // Get all elements
    const allPages = await db.getAllPages();
    let migratedCount = 0;

    for (const page of allPages) {
        const elements = await db.getPageElements(page.id);

        for (const element of elements) {
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
                await db.updateElement(element.id, { styles: newStyles });
                migratedCount++;
                console.log(`  Migrated element ${element.id} (${element.elementType})`);
            }
        }
    }

    console.log(`\n✅ Migrated ${migratedCount} elements to flow layout`);
    process.exit(0);
}

migrateLayouts().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});

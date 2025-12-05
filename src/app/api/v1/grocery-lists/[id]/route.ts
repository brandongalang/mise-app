import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groceryLists, groceryItems, containers, contents, masterIngredients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001";

// PATCH /api/v1/grocery-lists/:id - Update list status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updates: Record<string, unknown> = {};

        if (body.status) {
            updates.status = body.status;
            if (body.status === "completed") {
                updates.completedAt = new Date();
            }
        }

        await db.update(groceryLists).set(updates).where(eq(groceryLists.id, id));

        const updated = await db
            .select()
            .from(groceryLists)
            .where(eq(groceryLists.id, id))
            .limit(1);

        return NextResponse.json({ groceryList: updated[0] });
    } catch (error) {
        console.error("Error updating grocery list:", error);
        return NextResponse.json(
            { error: "Failed to update grocery list" },
            { status: 500 }
        );
    }
}

// POST /api/v1/grocery-lists/:id/complete - Complete shopping and add to inventory
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get all checked items
        const items = await db
            .select()
            .from(groceryItems)
            .where(eq(groceryItems.listId, id));

        const checkedItems = items.filter((item) => item.isChecked);

        // Add to inventory (simplified - creates new containers)
        for (const item of checkedItems) {
            // Check if master ingredient exists
            let masterId = item.name.toLowerCase().replace(/\s+/g, "_");

            const existingMaster = await db
                .select()
                .from(masterIngredients)
                .where(eq(masterIngredients.id, masterId))
                .limit(1);

            if (existingMaster.length === 0) {
                // Create master ingredient
                await db.insert(masterIngredients).values({
                    id: masterId,
                    householdId: HOUSEHOLD_ID,
                    canonicalName: item.name,
                    category: item.category,
                    defaultUnit: item.unit,
                    createdAt: new Date(),
                });
            }

            // Create container
            const containerId = `cont_${nanoid(12)}`;
            await db.insert(containers).values({
                id: containerId,
                householdId: HOUSEHOLD_ID,
                masterId,
                status: "SEALED",
                source: "manual",
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Create contents
            await db.insert(contents).values({
                id: `contents_${nanoid(12)}`,
                containerId,
                remainingQty: item.quantity,
                unit: item.unit,
                updatedAt: new Date(),
            });
        }

        // Mark list as completed
        await db
            .update(groceryLists)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(groceryLists.id, id));

        return NextResponse.json({
            success: true,
            itemsAdded: checkedItems.length,
        });
    } catch (error) {
        console.error("Error completing grocery list:", error);
        return NextResponse.json(
            { error: "Failed to complete grocery list" },
            { status: 500 }
        );
    }
}

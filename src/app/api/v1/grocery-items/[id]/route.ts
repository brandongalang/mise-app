import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/v1/grocery-items/:id - Toggle checked, update quantity
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const allowedFields = ["isChecked", "quantity", "unit", "name"];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        await db.update(groceryItems).set(updates).where(eq(groceryItems.id, id));

        const updated = await db
            .select()
            .from(groceryItems)
            .where(eq(groceryItems.id, id))
            .limit(1);

        return NextResponse.json({ item: updated[0] });
    } catch (error) {
        console.error("Error updating grocery item:", error);
        return NextResponse.json(
            { error: "Failed to update grocery item" },
            { status: 500 }
        );
    }
}

// DELETE /api/v1/grocery-items/:id - Remove item
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await db.delete(groceryItems).where(eq(groceryItems.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting grocery item:", error);
        return NextResponse.json(
            { error: "Failed to delete grocery item" },
            { status: 500 }
        );
    }
}

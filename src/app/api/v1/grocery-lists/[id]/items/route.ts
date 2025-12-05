import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST /api/v1/grocery-lists/:id/items - Add manual item
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: listId } = await params;
        const body = await request.json();
        const { name, quantity, unit, category } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Item name is required" },
                { status: 400 }
            );
        }

        const newItem = {
            id: `item_${nanoid(12)}`,
            listId,
            name,
            quantity: quantity || 1,
            unit: unit || "count",
            category: category || "other",
            isChecked: false,
            source: "manual",
            createdAt: new Date(),
        };

        await db.insert(groceryItems).values(newItem);

        return NextResponse.json({ item: newItem }, { status: 201 });
    } catch (error) {
        console.error("Error adding grocery item:", error);
        return NextResponse.json(
            { error: "Failed to add grocery item" },
            { status: 500 }
        );
    }
}

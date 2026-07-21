# Temporary workflow: opening sealed (before MVP3 — open / transform)

**For:** Humans and AI working on this repo.  
**Scope:** **Only** the gap until **MVP3** adds **open / transform** (same money, new SKUs: e.g. box → packs or singles). Nothing else belongs in this requirement.

**Status:** Drop this workflow when MVP3 ships.

---

## Problem

You already logged **cash** when you bought the sealed product. The Dashboard adds up every **Purchase** (and blank **Type**) **Total** → **Total Spent**.

If you post **only** new Purchase lines for packs/singles with real **Totals**, you count that money **twice**. MVP3 will handle this as one transform; until then you simulate it with Purchase rows whose **Totals net to zero** for the open event.

---

## Rule (one idea)

**One open = the rows you add together (same date)**

1. **Remove** the sealed unit from inventory: **Purchase**, same **Item** name as that sealed SKU, **Qty** negative (**−1** per unit you open), **Unit price** = **your true cost per sealed unit** (so **Total** is **negative**).
2. **Add** what you now stock: **Purchase** line(s), **Qty** positive, **Unit price** chosen so the **sum of these Totals** equals **that same positive dollar amount** (cost **moves** to children; no new spend).

Use the **date you open** on all these rows. Use the **same Category** on every row in the batch (from **Settings**) so category totals don’t look like random +/−.

**Check before you move on:**  
`(Total of close row) + (sum of Totals of open rows) = 0`  
→ **Total Spent** for the file should **not** step up because of this batch.

**Simplest case:** One child SKU — e.g. one row **Qty 10**, **Unit price** = (box cost ÷ 10), **Total** = box cost, plus the one **close** row above.

---

## Naming

**Item** on the close row must match the sealed line you are opening (same spelling as the original purchase). **Item** on open rows = how you want packs/singles to appear in inventory.

---

## What not to do

| Approach | Why skip |
|----------|-----------|
| Only **Note** “Opened” on the old row | **Qty** for sealed never drops. |
| New child rows with **$** Totals, **no** negative **Total** on the sealed **Item** | **Double-counts** spend. |
| Close with **Qty −1** but **Unit price 0** | **Qty** OK, but the **original** row still leaves **Total** on that sealed **Item** → Dashboard can show **Qty 0** and **Total Value** still from the old purchase on that name. Confusing. |

---

## Limits

- You split cost across children by hand (or one lump child line).  
- Typo in **Unit price** breaks the net‑$0 check — glance at **Total Spent** after posting.  
- Replaced by MVP3 **transform** when available.

---

## References

- **REQUIREMENTS.md** §7 — negative **Qty** / net inventory.  
- **README.md** — fixed **Transactions** column order and sheet names.

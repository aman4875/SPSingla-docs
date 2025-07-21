const updateFinancials = require("../utils/updateFinancials");
const { pool } = require("../helpers/database.helper");
const getCurrentDateTime = require("../utils/getCurrentDateTime");

const batchSize = 1000;

async function bulkUpdate(records) {
  if (records.length === 0) return;
  const now = getCurrentDateTime();
  const values = records
    .map(
      (r, i) =>
        `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${
          i * 5 + 5
        })`
    )
    .join(", ");

  const params = records.flatMap((r) => [
    r.doc_id,
    r.doc_interest,
    r.doc_tds,
    r.doc_margin_available,
    now,
  ]);
  const query = `
    UPDATE fdr_menu AS f SET
      doc_interest = v.doc_interest::numeric,
      doc_tds = v.doc_tds::numeric,
      doc_margin_available = v.doc_margin_available::numeric,
      updated_at = v.updated_at::text
    FROM (
      VALUES ${values}
    ) AS v(
      doc_id,
      doc_interest,
      doc_tds,
      doc_margin_available,
      updated_at
    )
    WHERE f.doc_id = v.doc_id::bigint
  `;

  await pool.query(query, params);
}

process.on("message", async (msg) => {
  if (msg === "start") {
    let offset = 0;
    let count = 0;
    try {
      while (true) {
        const { rows: data } = await pool.query(
          `SELECT doc_id, doc_renewal_amount, doc_interest_rate, doc_tds_rate, doc_renewal_date 
            FROM fdr_menu 
            ORDER BY doc_id 
            LIMIT $1 OFFSET $2`,
          [batchSize, offset]
        );

        if (data.length === 0) break;

        const updates = data.map((row) => {
          const updatedValue = updateFinancials(
            row.doc_renewal_amount,
            row.doc_interest_rate,
            row.doc_renewal_date,
            row.doc_tds_rate
          );
          count++;
          return {
            doc_id: row.doc_id,
            doc_interest: updatedValue.interest,
            doc_tds: updatedValue.tds,
            doc_margin_available: updatedValue.marginAvailable,
          };
        });

        await bulkUpdate(updates);
        offset += batchSize;
      }
      process.send({ status: "done", updatedCount: count });
    } catch (error) {
      console.log(error);
      process.send({ status: "error", error: error.message });
    }
  }
});

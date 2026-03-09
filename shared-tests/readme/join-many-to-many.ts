import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { prisma } from '#client';

describe("README Example: .manyToManyJoin", () => {
  test("basic M2M join generates correct SQL", () => {
    const $m2m =
// #region m2m-basic
prisma.$from("M2M_Post")
      .manyToManyJoin("M2M_Post", "M2M_Category");
      // #endregion m2m-basic
     const sql = $m2m.getSQL();

    const expectedSQL =
      // #region m2m-basic-sql
      "FROM M2M_Post JOIN _M2M_CategoryToM2M_Post ON _M2M_CategoryToM2M_Post.B = M2M_Post.id JOIN M2M_Category ON M2M_Category.id = _M2M_CategoryToM2M_Post.A;";
      // #endregion m2m-basic-sql

    assert.equal(sql, expectedSQL);
  });

  test("M2M join with target alias generates correct SQL", () => {
    const $m2m =
// #region m2m-alias
prisma.$from("M2M_Post")
      .manyToManyJoin("M2M_Post", "M2M_Category mc");
      // #endregion m2m-alias
     const sql = $m2m.getSQL();

    const expectedSQL =
      // #region m2m-alias-sql
      "FROM M2M_Post JOIN _M2M_CategoryToM2M_Post ON _M2M_CategoryToM2M_Post.B = M2M_Post.id JOIN M2M_Category AS `mc` ON mc.id = _M2M_CategoryToM2M_Post.A;";
      // #endregion m2m-alias-sql

    assert.equal(sql, expectedSQL);
  });

  test("M2M join with refName selects correct junction table", () => {
    const $m2m =
// #region m2m-refname
prisma.$from("MMM_Post")
      .manyToManyJoin("MMM_Post", "MMM_Category", { refName: "M2M_NC_M1" });
      // #endregion m2m-refname
     const sql = $m2m .getSQL();

    const expectedSQL =
      // #region m2m-refname-sql
      "FROM MMM_Post JOIN _M2M_NC_M1 ON _M2M_NC_M1.B = MMM_Post.id JOIN MMM_Category ON MMM_Category.id = _M2M_NC_M1.A;";
      // #endregion m2m-refname-sql

    assert.equal(sql, expectedSQL);
  });

  test("M2M join with aliased source resolves correct source entry", () => {
    const $m2m =
// #region m2m-source
prisma.$from("M2M_Post mp")
      .manyToManyJoin("mp", "M2M_Category mc");
      // #endregion m2m-source
      const sql = $m2m.getSQL();

    const expectedSQL =
      // #region m2m-source-sql
      "FROM M2M_Post AS `mp` JOIN _M2M_CategoryToM2M_Post ON _M2M_CategoryToM2M_Post.B = mp.id JOIN M2M_Category AS `mc` ON mc.id = _M2M_CategoryToM2M_Post.A;";
      // #endregion m2m-source-sql

    assert.equal(sql, expectedSQL);
  });
});

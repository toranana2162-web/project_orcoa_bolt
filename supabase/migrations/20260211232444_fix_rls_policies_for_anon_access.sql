/*
  # RLSポリシーを匿名アクセス対応に修正

  ## 変更内容
  院内共有端末での使用を想定しているため、認証なしでアクセスできるようにRLSポリシーを修正します。

  ## 変更対象
  - `lots` テーブルの全ポリシー（SELECT, INSERT, UPDATE, DELETE）
  - `reservations` テーブルの全ポリシー（SELECT, INSERT, UPDATE, DELETE）

  ## セキュリティ考慮事項
  - `TO authenticated` から `TO public` に変更
  - これにより認証の有無に関わらず、全ユーザーがアクセス可能に
  - 院内ネットワーク内での使用を前提としたセキュリティモデル
*/

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view all lots" ON lots;
DROP POLICY IF EXISTS "Users can insert lots" ON lots;
DROP POLICY IF EXISTS "Users can update lots" ON lots;
DROP POLICY IF EXISTS "Users can delete lots" ON lots;
DROP POLICY IF EXISTS "Users can view all reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update reservations" ON reservations;
DROP POLICY IF EXISTS "Users can delete reservations" ON reservations;

-- lots用の新しいポリシー（public アクセス）
CREATE POLICY "Public users can view all lots"
  ON lots FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public users can insert lots"
  ON lots FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public users can update lots"
  ON lots FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public users can delete lots"
  ON lots FOR DELETE
  TO public
  USING (true);

-- reservations用の新しいポリシー（public アクセス）
CREATE POLICY "Public users can view all reservations"
  ON reservations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public users can insert reservations"
  ON reservations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public users can update reservations"
  ON reservations FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public users can delete reservations"
  ON reservations FOR DELETE
  TO public
  USING (true);
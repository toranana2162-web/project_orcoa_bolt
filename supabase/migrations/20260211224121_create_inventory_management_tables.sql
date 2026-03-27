/*
  # 在庫管理システム用テーブル

  ## 概要
  歯科医院向けの検査キット在庫管理システム用のデータベーススキーマ。
  ロット単位での在庫管理と、FEFO方式での予約管理を実現。

  ## 1. 新規テーブル
  
  ### `lots` - ロット管理
  - `id` (uuid, primary key) - ロットID
  - `kit_type` (text) - キット種類（pg1000, td1000, tf1000, pg2000）
  - `quantity` (integer) - 入荷数
  - `reserved` (integer) - 取り置き中の数
  - `used` (integer) - 使用済みの数
  - `expiry_date` (date) - 有効期限
  - `received_date` (timestamptz) - 入荷日
  - `created_at` (timestamptz) - 作成日時

  ### `reservations` - 予約管理
  - `id` (uuid, primary key) - 予約ID
  - `examination_date` (date) - 検査日
  - `chart_number` (text) - カルテ番号
  - `kit_type` (text) - キット種類
  - `status` (text) - 状態（reserved, used, cancelled）
  - `lot_id` (uuid) - 関連するロットID
  - `created_at` (timestamptz) - 作成日時

  ## 2. セキュリティ
  - 両テーブルでRLSを有効化
  - 認証ユーザーに対して全操作を許可（院内共有端末を想定）

  ## 3. 注意事項
  - FEFOロジック：有効期限が近いロットから優先的に予約確保
  - 在庫計算：available = quantity - reserved - used
  - 発注推奨：今後7日間の予約と在庫バッファを考慮
*/

-- lots テーブル作成
CREATE TABLE IF NOT EXISTS lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_type text NOT NULL CHECK (kit_type IN ('pg1000', 'td1000', 'tf1000', 'pg2000')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  expiry_date date NOT NULL,
  received_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_quantities CHECK (reserved + used <= quantity)
);

-- reservations テーブル作成
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  examination_date date NOT NULL,
  chart_number text NOT NULL,
  kit_type text NOT NULL CHECK (kit_type IN ('pg1000', 'td1000', 'tf1000', 'pg2000')),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'used', 'cancelled')),
  lot_id uuid REFERENCES lots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_lots_kit_type ON lots(kit_type);
CREATE INDEX IF NOT EXISTS idx_lots_expiry_date ON lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_reservations_kit_type ON reservations(kit_type);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_examination_date ON reservations(examination_date);

-- RLS有効化
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- lots用のポリシー
CREATE POLICY "Users can view all lots"
  ON lots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert lots"
  ON lots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update lots"
  ON lots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete lots"
  ON lots FOR DELETE
  TO authenticated
  USING (true);

-- reservations用のポリシー
CREATE POLICY "Users can view all reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete reservations"
  ON reservations FOR DELETE
  TO authenticated
  USING (true);
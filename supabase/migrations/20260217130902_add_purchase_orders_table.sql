/*
  # 発注履歴テーブルの追加

  1. 新しいテーブル
    - `purchase_orders`
      - `id` (uuid, primary key)
      - `kit_type` (text) - キット種類
      - `order_date` (date) - 発注日
      - `expected_delivery_date` (date) - 納品予定日
      - `quantity` (integer) - 発注数量
      - `lot_number` (text) - ロット番号
      - `supplier` (text) - 仕入先
      - `notes` (text) - メモ
      - `status` (text) - ステータス（ordered, received, cancelled）
      - `received_quantity` (integer) - 入荷済み数量
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. 既存テーブルの変更
    - `lots`に`purchase_order_id`カラムを追加して発注履歴と紐づけ

  3. セキュリティ
    - RLSを有効化
    - 匿名ユーザーが全てのデータにアクセス可能なポリシーを追加
*/

-- 発注履歴テーブルを作成
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_type text NOT NULL CHECK (kit_type IN ('pg1000', 'td1000', 'tf1000', 'pg2000')),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  quantity integer NOT NULL CHECK (quantity > 0),
  lot_number text,
  supplier text,
  notes text,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'received', 'cancelled')),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- lotsテーブルにpurchase_order_idカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lots' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE lots ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id);
  END IF;
END $$;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_purchase_orders_kit_type ON purchase_orders(kit_type);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_lots_purchase_order_id ON lots(purchase_order_id);

-- RLSを有効化
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーが発注履歴を閲覧できるポリシー
CREATE POLICY "Allow anonymous users to view purchase orders"
  ON purchase_orders FOR SELECT
  TO anon
  USING (true);

-- 匿名ユーザーが発注履歴を作成できるポリシー
CREATE POLICY "Allow anonymous users to create purchase orders"
  ON purchase_orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- 匿名ユーザーが発注履歴を更新できるポリシー
CREATE POLICY "Allow anonymous users to update purchase orders"
  ON purchase_orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 匿名ユーザーが発注履歴を削除できるポリシー
CREATE POLICY "Allow anonymous users to delete purchase orders"
  ON purchase_orders FOR DELETE
  TO anon
  USING (true);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_orders_updated_at();
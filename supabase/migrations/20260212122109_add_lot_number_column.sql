/*
  # LOT番号カラムの追加

  ## 概要
  lotsテーブルにlot_numberカラムを追加し、LOT番号による管理を可能にします。

  ## 変更内容
  
  ### lotsテーブル
  - `lot_number` (text) - LOT番号（一意、NOT NULL）を追加
  
  ## 注意事項
  - 既存データがある場合は、自動生成されたLOT番号が設定されます
  - 今後の入荷時にはユーザーが指定したLOT番号が使用されます
*/

-- lot_numberカラムを追加（既存データ用に一時的にNULL許可）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lots' AND column_name = 'lot_number'
  ) THEN
    ALTER TABLE lots ADD COLUMN lot_number text;
  END IF;
END $$;

-- 既存データにLOT番号を自動生成（kit_type + タイムスタンプ）
UPDATE lots 
SET lot_number = kit_type || '-' || TO_CHAR(created_at, 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(id::text, 1, 8)
WHERE lot_number IS NULL;

-- NOT NULL制約とUNIQUE制約を追加
ALTER TABLE lots ALTER COLUMN lot_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lots_lot_number ON lots(lot_number);

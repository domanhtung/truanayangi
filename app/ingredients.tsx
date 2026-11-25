"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type Ingredient = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  weight: string;
  weightUnit: "g" | "kg" | "mg";
};

export function emptyIngredient(id = "first-ingredient"): Ingredient {
  return { id, name: "", quantity: "", unit: "", weight: "", weightUnit: "g" };
}

const measurement = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const inputStyle = "w-full min-w-0 rounded-lg border border-[#dedfd6] bg-[#fdfdf9] px-2.5 py-2 text-sm text-[#26362b] focus:border-[#55745b] focus:outline-none focus:ring-2 focus:ring-[#55745b]/25";
const labelStyle = "grid min-w-0 gap-1 text-xs font-medium text-[#4d5d50]";

type EditorProps = {
  rows: Ingredient[];
  onChange: (rows: Ingredient[]) => void;
  previousIngredients?: string;
};

export function IngredientEditor({ rows, onChange, previousIngredients }: EditorProps) {
  function update(id: string, changes: Partial<Ingredient>) {
    onChange(rows.map((row) => row.id === id ? { ...row, ...changes } : row));
  }

  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="mb-2 text-sm font-semibold">Nguyên liệu theo công thức gốc</legend>
      <p className="text-xs text-[#5c695e]">Nhập số lượng, khối lượng hoặc cả hai cho từng nguyên liệu.</p>
      {previousIngredients && (
        <div className="rounded-lg bg-[#f5f5ed] p-3 text-xs text-[#4d5d50]">
          <p className="font-semibold">Nguyên liệu đã ghi trước đây</p>
          <p className="mt-1 wrap-anywhere whitespace-pre-wrap">{previousIngredients}</p>
        </div>
      )}
      {rows.map((row, index) => (
        <div key={row.id} role="group" aria-label={`Nguyên liệu ${index + 1}`} className="grid gap-2 rounded-xl border border-[#e8e9e0] bg-[#fbfcf6] p-3">
          <div className="flex items-end gap-2">
            <label className={labelStyle + " flex-1"}>
              Tên nguyên liệu
              <input className={inputStyle} value={row.name} maxLength={120} placeholder="Ví dụ: Đùi gà" onChange={(event) => update(row.id, { name: event.target.value })} />
            </label>
            <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Bỏ nguyên liệu ${index + 1}`} onClick={() => onChange(rows.length === 1 ? [emptyIngredient()] : rows.filter((item) => item.id !== row.id))}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <label className={labelStyle}>
                Số lượng
                <input type="number" min="0" step="any" className={inputStyle} placeholder="4" value={row.quantity} onChange={(event) => update(row.id, { quantity: event.target.value })} />
              </label>
              <label className={labelStyle}>
                Đơn vị đếm
                <input className={inputStyle} placeholder="cái" maxLength={30} value={row.unit} onChange={(event) => update(row.id, { unit: event.target.value })} />
              </label>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <label className={labelStyle}>
                Khối lượng
                <input type="number" min="0" step="any" className={inputStyle} placeholder="600" value={row.weight} onChange={(event) => update(row.id, { weight: event.target.value })} />
              </label>
              <label className={labelStyle}>
                Đơn vị cân
                <select className={inputStyle} value={row.weightUnit} onChange={(event) => update(row.id, { weightUnit: event.target.value as Ingredient["weightUnit"] })}>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="mg">mg</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="justify-self-start" onClick={() => onChange([...rows, emptyIngredient(crypto.getRandomValues(new Uint32Array(4)).join("-"))])}>
        <Plus aria-hidden="true" /> Thêm nguyên liệu
      </Button>
    </fieldset>
  );
}

export function IngredientCalculator({ ingredients, baseServings }: { ingredients: Ingredient[]; baseServings: number }) {
  const [people, setPeople] = useState(String(baseServings));
  const count = Number(people);
  const validCount = Number.isSafeInteger(count) && count > 0;
  const factor = count / baseServings;

  function scaledAmount(amount: string, unit: string) {
    return amount ? [measurement.format(Number(amount) * factor), unit].filter(Boolean).join(" ") : "";
  }

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="font-semibold">Nguyên liệu</h4>
          <p className="text-xs text-[#5c695e]">Công thức gốc cho {baseServings} người</p>
        </div>
        <label className={labelStyle}>
          Số người ăn
          <input type="number" min="1" step="1" required aria-invalid={!validCount} className={inputStyle + " w-24"} value={people} onChange={(event) => setPeople(event.target.value)} />
        </label>
      </div>
      {validCount ? (
        <ul className="grid divide-y divide-[#e8e9e0] rounded-lg border border-[#e8e9e0] bg-[#fbfcf6]">
          {ingredients.map((ingredient) => (
            <li key={ingredient.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
              <span className="wrap-anywhere font-medium">{ingredient.name}</span>
              <span className="wrap-anywhere text-[#4d5d50]">
                {[scaledAmount(ingredient.quantity, ingredient.unit), scaledAmount(ingredient.weight, ingredient.weightUnit)].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="text-xs text-[#5c695e]">Nhập số người ăn là số nguyên dương để tính nguyên liệu.</p>
      )}
    </section>
  );
}

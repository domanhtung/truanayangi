"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type FormEvent } from "react";
import { BookOpen, ChefHat, ChevronDown, Clock, Plus, Search, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteDishesFromServer, fetchDishes, saveDishToServer, useDishes, type Dish } from "@/lib/dishes";
import type { InstructionsEditorHandle } from "@/app/instructions-editor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IngredientCalculator, IngredientEditor, emptyIngredient } from "@/app/ingredients";

const InstructionsEditor = dynamic(() => import("@/app/instructions-editor").then((module) => module.InstructionsEditor), {
  ssr: false,
  loading: () => <p className="min-h-36 text-sm text-[#5c695e]" role="status">Đang tải trình chỉnh sửa cách làm…</p>,
});
const InstructionsPreview = dynamic(() => import("@/app/instructions-editor").then((module) => module.InstructionsPreview), { ssr: false });

const categories = [
  "Xào", "Chiên", "Kho", "Hấp", "Luộc", "Nướng", "Rim",
  "Om", "Hầm", "Súp", "Nấu canh", "Trộn", "Áp chảo", "Khác",
];

const previousBaseServings = 4;

function recipeServings(dish: Dish) {
  return dish.baseServings ?? previousBaseServings;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");
}

const field = "w-full rounded-lg border border-[#dedfd6] bg-[#fdfdf9] px-3 py-2.5 text-sm text-[#26362b] placeholder:text-[#6d776d] focus:border-[#55745b] focus:outline-none focus:ring-2 focus:ring-[#55745b]/25";
const label = "grid min-w-0 gap-2 text-sm font-medium text-[#26362b]";
const primaryButton = "h-10 rounded-lg bg-[#294b37] px-4 text-white hover:bg-[#365d46]";

function focusCancel(button: HTMLButtonElement | null) {
  button?.focus();
}

export default function RecipeNotebook() {
  const { dishes, storageError, loading, refresh } = useDishes();
  const [editing, setEditing] = useState<Dish | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const instructionsEditor = useRef<InstructionsEditorHandle>(null);
  const [ingredientRows, setIngredientRows] = useState(() => [emptyIngredient()]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeletion, setPendingDeletion] = useState<Dish[]>([]);
  const deleteTrigger = useRef<HTMLElement>(null);
  const listTitle = useRef<HTMLHeadingElement>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const filterCategories = [...new Set([...categories, ...dishes.map((dish) => dish.category), category].filter(Boolean))];
  const searchTerm = normalize(query.trim());
  const visibleDishes = dishes.filter((dish) =>
    (!category || dish.category === category) && normalize(dish.name).includes(searchTerm),
  );

  const selectedDishes = visibleDishes.filter((dish) => selectedIds.includes(dish.id));
  const allVisibleSelected = visibleDishes.length > 0 && selectedDishes.length === visibleDishes.length;

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...current, id] : current.filter((selected) => selected !== id));
  }

  function requestDeletion(targets: Dish[], trigger: HTMLElement) {
    deleteTrigger.current = trigger;
    setPendingDeletion(targets);
    setDeleteFeedback(null);
  }

  function cancelDeletion() {
    setPendingDeletion([]);
    deleteTrigger.current?.focus();
  }

  async function confirmDeletion() {
    if (!pendingDeletion.length || deleting) return;

    const targets = pendingDeletion;
    const ids = targets.map((dish) => dish.id);
    const idSet = new Set(ids);
    setDeleting(true);
    setPendingDeletion([]);
    listTitle.current?.focus();

    try {
      const removedCount = await deleteDishesFromServer(ids);
      await refresh();
      setSelectedIds((current) => current.filter((id) => !idSet.has(id)));
      if (editing && idSet.has(editing.id)) changeForm(null);
      setDeleteFeedback({ text: removedCount ? `Đã xóa ${removedCount} món.` : "Các món đã chọn đã được xóa." });
    } catch {
      setDeleteFeedback({ text: "Không thể xóa món ăn. Hãy thử lại sau.", error: true });
    } finally {
      setDeleting(false);
    }
  }

  function changeForm(dish: Dish | null) {
    setEditing(dish);
    setIngredientRows(Array.isArray(dish?.ingredients) && dish.ingredients.length ? dish.ingredients : [emptyIngredient()]);
    setFeedback(null);
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  async function saveDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const baseServings = Number(value("baseServings"));
    if (!Number.isSafeInteger(baseServings) || baseServings < 1) {
      setFeedback({ text: "Hãy nhập số người theo công thức gốc là số nguyên dương.", error: true });
      return;
    }

    const ingredients = ingredientRows.map((row) => ({
      ...row,
      name: row.name.trim(),
      unit: row.unit.trim(),
    })).filter((row) => row.name || row.quantity || row.weight || row.unit);
    const invalidIngredient = ingredients.some((row) =>
      !row.name || (!row.quantity && !row.weight) ||
      (row.unit && !row.quantity) ||
      [row.quantity, row.weight].some((amount) => amount && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)),
    );
    if (invalidIngredient) {
      setFeedback({ text: "Mỗi nguyên liệu cần có tên và ít nhất một số lượng hoặc khối lượng lớn hơn 0. Hãy điền số lượng nếu đã ghi đơn vị đếm.", error: true });
      return;
    }

    const instructions = instructionsEditor.current?.read();
    if (!instructions?.text) {
      setFeedback({ text: "Hãy điền cách làm.", error: true });
      return;
    }
    if (instructions.text.length > 20000) {
      setFeedback({ text: "Cách làm chỉ được tối đa 20.000 ký tự.", error: true });
      return;
    }

    const dish: Dish = {
      id: editing?.id ?? Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-"),
      name: value("name"),
      category: value("category"),
      ingredients,
      previousIngredients: typeof editing?.ingredients === "string" ? editing.ingredients : editing?.previousIngredients,
      instructions: instructions.document,
      minutes: value("minutes"),
      servings: editing?.servings,
      baseServings,
      notes: value("notes"),
    };

    if (!dish.name || (!categories.includes(dish.category) && dish.category !== editing?.category)) {
      setFeedback({ text: "Hãy nhập tên món và chọn cách chế biến.", error: true });
      return;
    }

    const wasEditing = Boolean(editing);
    setSaving(true);
    try {
      if (wasEditing) {
        const currentDishes = await fetchDishes();
        if (!currentDishes.some((item) => item.id === dish.id)) {
          setFeedback({ text: "Món này đã bị xóa. Hãy hủy chỉnh sửa để quay về biểu mẫu thêm món.", error: true });
          return;
        }
      }
      await saveDishToServer(dish);
      await refresh();
    } catch {
      setFeedback({ text: "Không thể lưu món ăn. Hãy thử lại sau.", error: true });
      return;
    } finally {
      setSaving(false);
    }

    setFormRevision((revision) => revision + 1);
    setEditing(null);
    setIngredientRows([emptyIngredient()]);
    setQuery("");
    setCategory("");
    setSelectedIds([]);
    setFeedback({ text: wasEditing ? "Đã cập nhật món ăn." : "Đã lưu món ăn." });
  }

  return (
    <div className="min-h-dvh bg-[#f5f5ed] text-[#26362b]">
      <header className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-12">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Sổ tay món ăn</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5c695e] sm:text-base">Ghi lại công thức yêu thích để dễ tìm khi vào bếp.</p>
      </header>

      <main className="mx-auto grid max-w-7xl items-start gap-7 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-12">
        <section aria-labelledby="form-title">
          <Card className="bg-[#fffffb] ring-[#dbe0d3] [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
            <CardHeader className="grid-cols-[auto_1fr] items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#e8eee1] text-[#34513d]">
                {editing ? <BookOpen className="size-5" aria-hidden="true" /> : <Plus className="size-5" aria-hidden="true" />}
              </span>
              <div>
                <h2 id="form-title" className="text-lg font-semibold">{editing ? "Chỉnh sửa món ăn" : "Thêm món ăn"}</h2>
                <p className="text-sm text-[#5c695e]">Các trường có dấu * là bắt buộc.</p>
              </div>
            </CardHeader>
            <CardContent>
              <form key={editing?.id ?? formRevision} className="grid gap-4" onSubmit={saveDish}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={label}>
                    Tên món *
                    <input ref={nameInput} name="name" className={field} defaultValue={editing?.name} placeholder="Ví dụ: Gà kho gừng" maxLength={120} required />
                  </label>
                  <label className={label}>
                    Cách chế biến *
                    <select name="category" className={field} defaultValue={editing?.category ?? ""} required>
                      <option value="" disabled>Chọn cách chế biến</option>
                      {editing?.category && !categories.includes(editing.category) && (
                        <option value={editing.category}>{editing.category} (danh mục cũ)</option>
                      )}
                      {categories.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={label}>
                    Thời gian (phút)
                    <input name="minutes" className={field} type="number" min={1} max={14400} defaultValue={editing?.minutes} placeholder="30" />
                  </label>
                  <label className={label}>
                    Số người theo công thức gốc *
                    <input
                      name="baseServings"
                      className={field}
                      type="number"
                      min={1}
                      max={Number.MAX_SAFE_INTEGER}
                      step={1}
                      defaultValue={editing && Array.isArray(editing.ingredients) ? recipeServings(editing) : editing?.servings}
                      placeholder="Ví dụ: 6"
                      required
                    />
                  </label>
                </div>
                <IngredientEditor
                  rows={ingredientRows}
                  onChange={setIngredientRows}
                  previousIngredients={typeof editing?.ingredients === "string" ? editing.ingredients : editing?.previousIngredients}
                />
                <InstructionsEditor ref={instructionsEditor} initialContent={editing?.instructions} />
                <label className={label}>
                  Ghi chú
                  <textarea name="notes" className={field} defaultValue={editing?.notes} rows={2} maxLength={5000} placeholder="Mẹo nấu, cách bảo quản hoặc món ăn kèm" />
                </label>
                <div className="flex flex-wrap items-center gap-3 border-t border-[#e8e9e0] pt-4">
                  <Button type="submit" disabled={storageError || saving} className={primaryButton}>
                    {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Lưu món ăn"}
                  </Button>
                  {editing && <Button type="button" variant="outline" className="h-10" onClick={() => changeForm(null)}>Hủy chỉnh sửa</Button>}
                  {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "text-red-800" : "text-[#34513d]"}>{feedback.text}</p>}
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="list-title" className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="list-title" ref={listTitle} tabIndex={-1} className="font-serif text-3xl tracking-tight">Món đã lưu</h2>
            <span className="rounded-full bg-[#e6ecde] px-3 py-1 text-sm font-medium text-[#34513d]">{dishes.length} món</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative">
              <span className="sr-only">Tìm theo tên món</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5c695e]" aria-hidden="true" />
              <input type="search" className={field + " pl-9"} placeholder="Tìm theo tên món" value={query} onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIds([]);
              }} />
            </label>
            <select aria-label="Lọc theo cách chế biến" className={field} value={category} onChange={(event) => {
              setCategory(event.target.value);
              setSelectedIds([]);
            }}>
              <option value="">Mọi cách chế biến</option>
              {filterCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          {visibleDishes.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedIds(allVisibleSelected ? [] : visibleDishes.map((dish) => dish.id))}
              >
                {allVisibleSelected ? "Bỏ chọn tất cả" : "Chọn tất cả món đang hiển thị"}
              </Button>
              <Button type="button" variant="destructive" disabled={!selectedDishes.length} onClick={(event) => requestDeletion(selectedDishes, event.currentTarget)}>
                <Trash2 aria-hidden="true" />
                {selectedDishes.length ? `Xóa ${selectedDishes.length} món` : "Xóa món đã chọn"}
              </Button>
            </div>
          )}
          {deleteFeedback && (
            <p role={deleteFeedback.error ? "alert" : "status"} className={deleteFeedback.error ? "text-sm text-red-800" : "text-sm text-[#34513d]"}>
              {deleteFeedback.text}
            </p>
          )}

          {storageError ? (
            <p role="alert" className="rounded-xl bg-white p-5 text-sm text-red-800">Không thể tải danh sách món ăn từ cơ sở dữ liệu.</p>
          ) : loading ? (
            <p role="status" className="rounded-xl border border-dashed border-[#c6cfc0] bg-[#fbfcf6] px-5 py-12 text-center text-sm text-[#5c695e]">
              Đang tải món đã lưu…
            </p>
          ) : visibleDishes.length === 0 ? (
            <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-[#c6cfc0] bg-[#fbfcf6] px-5 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-[#e8eee1] text-[#34513d]">
                <ChefHat className="size-7" aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{dishes.length ? "Không tìm thấy món phù hợp" : "Chưa có món ăn nào"}</h3>
              <p className="max-w-xs text-sm text-[#5c695e]">{dishes.length ? "Thử đổi từ khóa hoặc chọn cách chế biến khác." : "Điền biểu mẫu để lưu món ăn đầu tiên."}</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {visibleDishes.map((dish) => (
                <li key={dish.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <label className="grid min-h-12 min-w-8 cursor-pointer place-items-center pt-1">
                    <span className="sr-only">Chọn món {dish.name}</span>
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer accent-[#294b37]"
                      checked={selectedIds.includes(dish.id)}
                      onChange={(event) => toggleSelection(dish.id, event.target.checked)}
                    />
                  </label>
                  <details className="group rounded-xl border border-[#dbe0d3] bg-[#fffffb]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-[#55745b] [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold">{dish.name}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#5c695e]">
                          <span className="rounded-full bg-[#e8eee1] px-2 py-0.5 text-[#34513d]">{dish.category}</span>
                          {dish.minutes && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{dish.minutes} phút</span>}
                          {Array.isArray(dish.ingredients) && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />Gốc {recipeServings(dish)} người</span>}
                          {typeof dish.ingredients === "string" && dish.servings && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{dish.servings} người</span>}
                        </div>
                      </div>
                      <ChevronDown className="size-4 shrink-0 text-[#5c695e] group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="grid gap-4 border-t border-[#e8e9e0] p-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => changeForm(dish)}>Chỉnh sửa</Button>
                        <Button type="button" variant="destructive" onClick={(event) => requestDeletion([dish], event.currentTarget)}>
                          <Trash2 aria-hidden="true" /> Xóa món
                        </Button>
                      </div>
                      {Array.isArray(dish.ingredients) && dish.ingredients.length > 0 && (
                        <IngredientCalculator key={recipeServings(dish)} ingredients={dish.ingredients} baseServings={recipeServings(dish)} />
                      )}
                      {(typeof dish.ingredients === "string" ? dish.ingredients : dish.previousIngredients) && (
                        <div>
                          <h4 className="mb-1 font-semibold">
                            Nguyên liệu đã ghi trước đây{dish.servings && ` (${dish.servings} người)`}
                          </h4>
                          <p className="wrap-anywhere whitespace-pre-wrap text-[#4d5d50]">
                            {typeof dish.ingredients === "string" ? dish.ingredients : dish.previousIngredients}
                          </p>
                        </div>
                      )}
                      <div>
                        <h4 className="mb-1 font-semibold">Cách làm</h4>
                        <InstructionsPreview content={dish.instructions} />
                      </div>
                      {dish.notes && (
                        <div>
                          <h4 className="mb-1 font-semibold">Ghi chú</h4>
                          <p className="wrap-anywhere whitespace-pre-wrap text-[#4d5d50]">{dish.notes}</p>
                        </div>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[#5c695e]">Món ăn được lưu trên cơ sở dữ liệu Neon.</p>
        </section>
      </main>
      {pendingDeletion.length > 0 && (
        <section
          aria-labelledby="delete-toast-title"
          aria-describedby="delete-toast-description"
          className="fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-xl border border-[#dbe0d3] bg-[#fffffb] p-4 shadow-xl sm:left-auto sm:w-96"
          onKeyDown={(event) => {
            if (event.key === "Escape") cancelDeletion();
          }}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
            <Trash2 className="size-4" aria-hidden="true" />
          </span>
          <div className="grid min-w-0 flex-1 gap-2">
            <h2 id="delete-toast-title" className="wrap-anywhere text-sm font-semibold" role="status">
              {pendingDeletion.length === 1
                ? `Xóa món “${pendingDeletion[0].name}”?`
                : `Xóa ${pendingDeletion.length} món đã chọn?`}
            </h2>
            <p id="delete-toast-description" className="text-sm text-[#5c695e]">Thao tác này không thể hoàn tác.</p>
            <div className="mt-1 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelDeletion} ref={focusCancel}>Hủy</Button>
              <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDeletion()}>
                {deleting ? "Đang xóa…" : "Xác nhận xóa"}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

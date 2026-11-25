"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, ChefHat, ChevronDown, Shuffle, Utensils, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDishes, type Dish } from "@/lib/dishes";
import { addDishToActiveTrip, useActiveHolidayTrip, useTripDishes, type HolidayTrip } from "@/lib/holiday-trips";
import { CookingScene, cookingKindForCategory, pickCookingScene, type CookingKind } from "./cooking-scene";
import "./dish-reel.css";

type ReelDish = Pick<Dish, "name" | "category">;

const cookingCategories = [
  "Xào", "Chiên", "Kho", "Hấp", "Luộc", "Nướng", "Rim",
  "Om", "Hầm", "Súp", "Nấu canh", "Trộn", "Áp chảo", "Khác",
];

const sampleCards: ReelDish[] = ["Luộc", "Xào", "Trộn", "Nướng", "Kho"].map((category) => ({
  name: category,
  category,
}));
const reelPadding = 4;
const artByKind: Record<CookingKind, { asset: string; tint: string }> = {
  pan: { asset: "stir-food", tint: "#dca36c" },
  pressure: { asset: "braised-dish", tint: "#d6a465" },
  boil: { asset: "soup-pot", tint: "#83adbd" },
  grill: { asset: "grill-skewers", tint: "#e3a089" },
  mix: { asset: "mixing-bowl", tint: "#9cbd91" },
};

type Spin = {
  dish: Dish;
  scene: CookingKind;
  cards: ReelDish[];
  target: number;
  phase: "spinning" | "cooking" | "finished" | "settled";
};

function DishArt({ kind }: { kind?: CookingKind }) {
  return kind ? (
    <Image
      src={`/cooking/${artByKind[kind].asset}.webp`}
      alt=""
      fill
      sizes="(max-width: 640px) 140px, 230px"
      loading="eager"
      unoptimized
    />
  ) : <Utensils aria-hidden="true" />;
}

function CookingDialog({
  spin,
  activeTrip,
  onComplete,
  onClose,
}: {
  spin: Spin;
  activeTrip: HolidayTrip | null;
  onComplete: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const finished = spin.phase === "finished";
  const [adding, setAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  async function addToTrip() {
    if (!activeTrip || adding) return;
    setAdding(true);
    setAddFeedback(null);
    try {
      const result = await addDishToActiveTrip(spin.dish.id);
      setAddFeedback({
        text: result.added
          ? `Đã thêm vào “${result.trip.name}”.`
          : `Món này đã có trong “${result.trip.name}”.`,
      });
    } catch (error) {
      setAddFeedback({
        text: error instanceof Error ? error.message : "Không thể thêm món vào kỳ nghỉ.",
        error: true,
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cooking-dialog-title"
      onClose={onClose}
      className="cooking-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none flex-col border-0 bg-[#172720] p-0 text-[#fbf2dc]"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-3 sm:px-6">
        <h2 id="cooking-dialog-title" className="text-base font-semibold sm:text-lg">Kết quả quay</h2>
        <Button type="button" variant="ghost" onClick={() => dialog.current?.close()} className="h-9 text-[#fbf2dc] hover:bg-white/15 hover:text-white">
          <X aria-hidden="true" /> Đóng
        </Button>
      </header>
      <div className="cooking-dialog-stage flex min-h-0 flex-1 items-center justify-center px-3 py-2 sm:px-6 sm:py-4">
        <div className="sr-only" role="status">{finished ? `Món hôm nay là ${spin.dish.name}` : ""}</div>
        {finished ? (
          <div className="dish-reel-result">
            <div className="dish-reel-result-art"><DishArt kind={spin.scene} /></div>
            <p className="dish-reel-eyebrow">Món hôm nay</p>
            <p data-selected-dish className="dish-reel-result-name">{spin.dish.name}</p>
            <p className="dish-reel-muted">{spin.dish.category}</p>
            {activeTrip ? (
              <div className="mt-5 grid justify-items-center gap-2">
                <Button
                  type="button"
                  disabled={adding}
                  onClick={() => void addToTrip()}
                  className="h-10 rounded-lg bg-[#e7c48a] px-4 text-[#1b2a20] hover:bg-[#f0d19a]"
                >
                  <CalendarDays aria-hidden="true" />
                  {adding ? "Đang thêm…" : `Thêm vào “${activeTrip.name}”`}
                </Button>
                {addFeedback && (
                  <p role={addFeedback.error ? "alert" : "status"} className={addFeedback.error ? "text-sm text-red-200" : "text-sm text-[#dce8d4]"}>
                    {addFeedback.text}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-[#c9d4c0]">
                Chưa có kỳ nghỉ đang mở.{" "}
                <Link href="/ky-nghi" className="underline underline-offset-2 hover:text-white">
                  Tạo kỳ nghỉ
                </Link>
              </p>
            )}
          </div>
        ) : <CookingScene kind={spin.scene} onComplete={onComplete} />}
      </div>
    </dialog>
  );
}

export default function Home() {
  const { dishes, storageError } = useDishes();
  const { trip: activeTrip } = useActiveHolidayTrip();
  const { dishes: tripDishes } = useTripDishes(activeTrip?.id ?? null);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [excludeTripDishes, setExcludeTripDishes] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const spinning = spin?.phase === "spinning";
  const dialogOpen = spin?.phase === "cooking" || spin?.phase === "finished";

  const categoryOptions = useMemo(
    () => [...new Set([...cookingCategories, ...dishes.map((dish) => dish.category)].filter(Boolean))],
    [dishes],
  );

  const tripDishIds = useMemo(() => new Set(tripDishes.map((dish) => dish.id)), [tripDishes]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      if (selectedCategories.length && !selectedCategories.includes(dish.category)) return false;
      if (excludeTripDishes && activeTrip && tripDishIds.has(dish.id)) return false;
      return true;
    });
  }, [dishes, selectedCategories, excludeTripDishes, activeTrip, tripDishIds]);

  const pool = filteredDishes.length ? filteredDishes : sampleCards;
  const center = Math.min(1, pool.length - 1);
  const idleCards = Array.from({ length: reelPadding * 2 + 1 }, (_, index) => {
    const offset = center + index - reelPadding;
    return pool[((offset % pool.length) + pool.length) % pool.length];
  });
  const cards = spin?.cards ?? idleCards;
  const target = spin?.target ?? reelPadding;
  const canSpin = !storageError && filteredDishes.length > 0 && !spinning && !dialogOpen;

  function start() {
    if (!canSpin) return;

    const dish = filteredDishes[Math.floor(Math.random() * filteredDishes.length)];
    const leadIn = cards.slice(target - reelPadding, target + reelPadding + 1);
    const passing = Array.from({ length: 18 }, () => filteredDishes[Math.floor(Math.random() * filteredDishes.length)]);
    const tail = Array.from({ length: reelPadding }, () => filteredDishes[Math.floor(Math.random() * filteredDishes.length)]);
    setSpin({
      dish,
      scene: pickCookingScene(dish.category),
      cards: [...leadIn, ...passing, dish, ...tail],
      target: leadIn.length + passing.length,
      phase: "spinning",
    });
  }

  const categorySummary = selectedCategories.length
    ? `Đã chọn ${selectedCategories.length} cách chế biến`
    : "Mọi cách chế biến";

  return (
    <main className="dish-reel-page">
      <div className="dish-reel-content">
        <header className="dish-reel-intro">
          <h1>Hôm nay ăn gì?</h1>
          <p>Bấm Quay để chọn một món ngẫu nhiên từ sổ tay của bạn.</p>
        </header>

        <section aria-label="Quay chọn món" className="dish-reel-panel">
          <div className="dish-reel-panel-header">
            <h2><ChefHat aria-hidden="true" /> Quay chọn món</h2>
            <span>
              {filteredDishes.length === dishes.length
                ? `${dishes.length} món trong sổ tay`
                : `${filteredDishes.length}/${dishes.length} món phù hợp`}
            </span>
          </div>

          <div className="dish-reel-filters">
            <div className="dish-reel-filter">
              <span className="dish-reel-filter-label" id="category-filter-label">Cách chế biến</span>
              <details
                className="dish-reel-multi-select"
                open={categoryMenuOpen}
                onToggle={(event) => setCategoryMenuOpen(event.currentTarget.open)}
              >
                <summary aria-labelledby="category-filter-label">
                  <span>{categorySummary}</span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <div className="dish-reel-multi-select-panel" role="group" aria-labelledby="category-filter-label">
                  <div className="dish-reel-multi-select-actions">
                    <button type="button" onClick={() => setSelectedCategories([])}>Mọi cách chế biến</button>
                  </div>
                  <ul>
                    {categoryOptions.map((category) => {
                      const checked = selectedCategories.length === 0 || selectedCategories.includes(category);
                      return (
                        <li key={category}>
                          <label>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (selectedCategories.length === 0) {
                                  setSelectedCategories(categoryOptions.filter((item) => item !== category));
                                  return;
                                }
                                const next = selectedCategories.includes(category)
                                  ? selectedCategories.filter((item) => item !== category)
                                  : [...selectedCategories, category];
                                setSelectedCategories(next.length === categoryOptions.length ? [] : next);
                              }}
                            />
                            <span>{category}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            </div>

            <label className={`dish-reel-filter dish-reel-filter-optional ${activeTrip ? "" : "is-disabled"}`}>
              <span className="dish-reel-filter-label">Tùy chọn</span>
              <span className="dish-reel-option-row">
                <input
                  type="checkbox"
                  checked={excludeTripDishes}
                  disabled={!activeTrip}
                  onChange={(event) => setExcludeTripDishes(event.target.checked)}
                />
                <span>
                  {activeTrip
                    ? `Loại món đã có trong “${activeTrip.name}”`
                    : "Loại món đã có trong kỳ nghỉ đang mở (chưa có kỳ đang mở)"}
                </span>
              </span>
            </label>
          </div>

          <div className="dish-reel-viewport" data-picked={Boolean(spin) && !spinning}>
            <div className="dish-reel-track-window" aria-hidden="true">
              <div
                className="dish-reel-track"
                data-spinning={spinning}
                style={{ "--reel-index": target, "--reel-start": reelPadding } as CSSProperties}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget) {
                    setSpin((current) => current?.phase === "spinning" ? { ...current, phase: "cooking" } : current);
                  }
                }}
              >
                {cards.map((card, index) => {
                  const kind = cookingKindForCategory(card.category) ?? "mix";
                  return (
                    <div
                      key={index}
                      className="dish-reel-card"
                      data-picked={Boolean(spin) && index === target}
                      style={{ "--card-tint": artByKind[kind].tint } as CSSProperties}
                    >
                      <div className="dish-reel-card-art"><DishArt kind={kind} /></div>
                      <div className="dish-reel-card-caption">
                        <p>{card.category}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="dish-reel-marker" aria-hidden="true" />
          </div>

          <div className="dish-reel-actions">
            <button
              type="button"
              onClick={start}
              disabled={storageError || !filteredDishes.length}
              aria-disabled={spinning || dialogOpen || undefined}
              className="dish-reel-spin-button"
            >
              <Shuffle aria-hidden="true" /> {spinning ? "Đang quay…" : "Quay"}
            </button>
            {!storageError && dishes.length > 0 && filteredDishes.length === 0 && (
              <p role="status" className="dish-reel-muted">Không còn món phù hợp với bộ lọc hiện tại.</p>
            )}
            {storageError ? (
              <p role="alert" className="dish-reel-muted">Không thể tải danh sách món đã lưu.</p>
            ) : (
              <Link href="/so-tay-mon-an" className="dish-reel-notebook-link">
                <BookOpen aria-hidden="true" />
                {dishes.length ? "Mở sổ tay món ăn" : "Thêm món vào sổ tay"}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            )}
            {activeTrip && (
              <p className="dish-reel-muted">
                Kỳ đang mở: {activeTrip.name}. Sau khi quay có thể thêm món vào kỳ này.
              </p>
            )}
            <p className="sr-only" role="status">
              {spinning ? "Đang quay chọn món" : spin?.phase === "settled" ? `Đã chọn ${spin.dish.name}` : ""}
            </p>
          </div>
        </section>
      </div>

      {dialogOpen && spin && (
        <CookingDialog
          spin={spin}
          activeTrip={activeTrip}
          onComplete={() => setSpin((current) => current?.phase === "cooking" ? { ...current, phase: "finished" } : current)}
          onClose={() => setSpin((current) => current && { ...current, phase: "settled" })}
        />
      )}
    </main>
  );
}

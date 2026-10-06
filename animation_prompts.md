# Промпты для кадров анимации персонажа

Референс: `8ace102b-1098-47dc-b0d1-1a59d89edcf5.png`. Прикладывать к каждому запросу.

Каждый промпт = **общий блок** + **блок анимации**. Каждую анимацию генерировать отдельным запросом.

---

## Общий блок (вставлять в начало каждого промпта)

```
Use the attached image as the strict character reference. Draw EXACTLY the same character: same boy, same face, same proportions, same outfit, same colors, same art style. Do not redesign, restyle or add anything.

Character lock: chibi 2D cartoon game sprite, oversized head (about 1/2 of body height), short tousled light brown hair, big round blue-gray eyes with large dark pupils, small rounded nose, ears sticking out, cheerful smile showing two front teeth, red t-shirt with white collar and white sleeve trims, short red cape behind the back, dark brown shorts, white socks, white sneakers with black soles, gray sci-fi blaster pistol with blue glowing barrel held in the right hand.

Style lock: thick uniform dark brown outlines, flat cel shading with exactly one shadow tone, clean vector game art, no gradients, no textures, no motion blur.

Sprite sheet format: one horizontal row of equally sized frames, the character is the same size and at the same scale in every frame, feet aligned on the same baseline (except airborne frames), side view facing RIGHT, full body visible in every frame, nothing cropped, even spacing, plain flat pure white background (#FFFFFF), no ground shadow, no text, no numbers, no frame borders, no extra characters.
```

---

## Стойка / idle (4 кадра)

Тихое «дыхание» на месте. Движение должно быть еле заметным: если кадры сильно отличаются, анимация дёргается.

```
Animation: IDLE, exactly 4 frames in one row, seamless loop, calm breathing while standing still.

POSE – identical in all 4 frames:
standing relaxed, feet flat on the ground about shoulder width apart, knees straight, weight evenly on both feet, body facing right, head looking right, same friendly smile. Right arm holds the blaster relaxed in front of the body at waist level, barrel pointing forward and slightly down. Left arm hangs loosely at the side.

BREATHING – the only change between frames:
Frame 1 NEUTRAL: base pose.
Frame 2 INHALE: chest and shoulders rise slightly, head moves up by about 1% of the character height, cape lifts a tiny bit.
Frame 3 HOLD: same as frame 2, cape tail drifts slightly back.
Frame 4 EXHALE: shoulders and head settle back down to the base pose, cape relaxes.
The blaster arm moves together with the shoulders, the blaster's blue barrel glow stays the same.

LAYOUT: the character is exactly the same size in every frame, feet do not move at all and stay on one straight ground line, frames evenly spaced with equal gaps.

FORBIDDEN: walking, stepping, shifting feet, bending knees, crouching, leaning, turning the head, blinking with closed eyes in more than one frame, changing the expression, raising or aiming the blaster, changing the character's size.
```

**Варианты:**
- Моргание: в кадре 3 добавить `eyes closed in a short blink, everything else unchanged`. Лучше держать отдельным вариантом и вставлять кадр в игре раз в несколько циклов.
- Если модель двигает персонажа слишком сильно, попросите 2 кадра (NEUTRAL и INHALE), а промежуточные получите повтором.

---

## Ходьба вправо (8 кадров, сетка 2×4)

Полный цикл — это **два шага**: сначала шагает ближняя нога, потом дальняя. На каждый шаг 4 фазы: CONTACT → DOWN → PASSING → UP. В 6 кадрах на шаг остаётся по 3 фазы, и цикл выглядит рваным.

Кадры идут сеткой **2 ряда по 4**: верхний ряд — шаг ближней ноги, нижний — шаг дальней. Так модели проще: ряды одинаковые по смыслу, отличается только то, какая нога впереди. Заодно кадры получаются крупнее, чем при 8 в одну строку.

Ноги описаны не «правая/левая», а **ближняя** (к зрителю, рисуется поверх) и **дальняя** (за ней, на тон темнее). Так модель не путает стороны в профиль.

В общем блоке для этого промпта замените `one horizontal row of equally sized frames` на `a 2x4 grid of equally sized frames`, иначе инструкции будут спорить.

```
Animation: WALK CYCLE, exactly 8 frames arranged in a grid of 2 rows x 4 columns, read left to right, top row first. Seamless loop: after frame 8 comes frame 1 again. Classic calm 2D platformer walk.

NEAR leg = the leg closer to the viewer, drawn on top, normal colors. FAR leg = the leg behind it, partly hidden, drawn one shade darker (darker skin, sock and shoe). This shading must stay consistent in all 8 frames so the two legs are always distinguishable.

TOP ROW – step with the NEAR leg:
Frame 1 CONTACT: near leg reaches forward, straight, heel touching the ground; far leg stretched back, only its toe touching the ground. Widest stride.
Frame 2 DOWN: near foot flat on the ground in front of the hips, near knee slightly bent, taking the weight; far foot leaves the ground behind, far knee bending. Body at its lowest.
Frame 3 PASSING: near leg straight and vertical under the hips; far leg bent at the knee, its foot lifted just above the ground and passing BEHIND the near leg, at the same x position as the near ankle.
Frame 4 UP: near leg pushes off, slightly behind the hips, heel lifting; far leg swings forward ahead of the body, knee bent, foot in the air about to reach forward. Body at its highest.

BOTTOM ROW – exactly the same 4 phases, but the legs swap roles:
Frame 5 CONTACT: FAR leg reaches forward with heel touching; NEAR leg stretched back on its toe. Widest stride.
Frame 6 DOWN: far foot flat on the ground in front of the hips taking the weight; near foot leaves the ground behind.
Frame 7 PASSING: far leg straight and vertical under the hips; near leg bent, foot lifted just above the ground, passing IN FRONT of the far leg (drawn on top of it).
Frame 8 UP: far leg pushes off behind the hips; near leg swings forward ahead of the body, knee bent, foot in the air.

Check: frames 1 and 5 look almost the same except which leg is in front; same for 2/6, 3/7, 4/8. In every frame at least one foot touches the ground. Feet always point right. Stride length is the same in frames 1 and 5.

UPPER BODY – identical in all 8 frames:
same head size, same head angle, same face and expression, same torso, same gun arm pose: right arm held forward at chest level holding the blaster, perfectly steady.
The free left arm swings a little, opposite to the near leg: back in frame 1, forward in frame 5. The cape tail sways slightly. Vertical bob is small, at most 3% of the character height: lowest in DOWN frames (2, 6), highest in UP frames (4, 8).

LAYOUT: all 8 cells are the same size, the character is exactly the same size in every frame, feet on the same ground line within each row, both rows aligned identically, equal gaps between cells, no frame overlaps another.

FORBIDDEN: crouching, squatting, jumping, running, both feet side by side, crossed legs, knees bent deeper than in a normal calm walk, leaning forward, changing the character's size, turning the head, extra legs, missing feet, drawing the bottom row as a copy of the top row.
```

**Если ходьба разваливается:**
1. Сначала попросите только верхний ряд (кадры 1–4, шаг ближней ноги) и проверьте его.
2. Затем, прикрепив этот ряд как референс, попросите нижний: `Use this row as frames 1-4. Draw frames 5-8: the same 4 phases with the legs swapped – the FAR (darker) leg now steps forward, the NEAR leg pushes off behind.`
3. Если модель путает кадры даже так, просите по одному кадру на запрос. Прикладывайте предыдущий кадр и пишите: `Same character, same everything, change ONLY the legs to: <описание кадра>`.
4. Запасной вариант: в мультяшном профиле ноги почти одинаковые, поэтому даже один удачный ряд из 4 кадров, зацикленный дважды, выглядит прилично.

### Если модель не ставит дальнюю ногу вперёд

Генераторы плохо понимают «ближняя/дальняя» и почти всегда рисуют впереди ногу, которая лежит сверху. Поэтому не просим ряд целиком, а **правим по одному готовому кадру**, описывая ноги по тому, что видно на картинке: цвет носка и какой ботинок правее.

Готовые правильные кадры лежат в `walk_fix/`: `f1_contact`, `f2_down`, `f3_passing`, `f7_passing`. Не хватает двух: CONTACT и DOWN с дальней ногой впереди. С ними получается полный цикл из 6 кадров: 1 → 2 → 3 → **5** → **6** → 7.

Каждый запрос — отдельный, прикладывать один файл. Общий блок НЕ нужен.

**Кадр 5 (приложить `walk_fix/f1_contact.png`):**
```
Edit this sprite. Keep EVERYTHING identical – head, face, torso, arms, blaster, cape, size, position, white background – and redraw ONLY the two legs.

Now: the leg with the WHITE sock is in front (its shoe is the rightmost), the leg with the GRAY sock is behind.
Make it the other way round:
- GRAY-sock leg: reaches forward, straight, heel on the ground. Its shoe is now the RIGHTMOST shoe in the picture, in exactly the spot where the white shoe is now.
- WHITE-sock leg: stretched backward, only its toe touching the ground. Its shoe is now the LEFTMOST shoe, in exactly the spot where the gray shoe is now.
- The white-sock leg is still closer to the viewer, so at the hips it is drawn ON TOP of the gray-sock leg and hides the top of its thigh.
Keep the sock colors: the forward foot has a gray sock and a slightly darker shoe, the back foot has a white sock.
The result must look like the same stride, only the legs swapped places.
```

**Кадр 6 (приложить `walk_fix/f2_down.png`):**
```
Edit this sprite. Keep EVERYTHING identical – head, face, torso, arms, blaster, cape, size, position, white background – and redraw ONLY the two legs.

Now: the WHITE-sock leg stands flat in front, the GRAY-sock leg is lifted behind.
Make it the other way round:
- GRAY-sock leg: foot flat on the ground in front of the hips, knee slightly bent, carrying the weight. Its shoe is the RIGHTMOST shoe, standing on the ground.
- WHITE-sock leg: behind the body, knee bent, its foot lifted off the ground with the toe pointing down. Its shoe is the LEFTMOST shoe, in the air.
- The white-sock leg is closer to the viewer, so it is drawn ON TOP of the gray-sock leg where they overlap.
The result must look like the same pose, only the legs swapped places.
```

**Проверка результата:** в обоих кадрах правый (передний) ботинок должен быть с серым носком. Если модель снова поменяла только цвет носков, а не позу, это тоже годится: в игре нужна именно картинка «серый носок впереди».

## Ходьба влево

Лучше отзеркалить лист «ходьба вправо» скриптом: обе стороны гарантированно совпадут.

Если генерировать отдельно, в общем блоке заменить `facing RIGHT` на `facing LEFT` и добавить:

```
Mirror the character horizontally, keep every other detail identical.
```

---

## Прыжок (6 кадров)

```
Animation: JUMP, 6 frames, plays once.
Frame 1: anticipation – deep crouch, knees bent, arms pulled back.
Frame 2: take-off – legs extending, body stretched upward, toes leaving ground.
Frame 3: rising – airborne, knees tucked up, cape and hair flowing downward.
Frame 4: apex – highest point, compact tucked pose, cape floating.
Frame 5: falling – legs extending down toward ground, cape and hair flowing upward.
Frame 6: landing – feet on ground, knees bent to absorb impact, slight squash.
Blaster stays in the right hand in every frame. Airborne frames show the character higher in the cell; ground frames keep feet on the baseline.
```

---

## Стрельба (4 кадра)

```
Animation: SHOOT, 4 frames.
Frame 1: aim – standing firm, right arm fully extended forward holding the blaster level, left hand in a fist at the side, focused determined expression.
Frame 2: fire – same pose, bright blue-white muzzle flash at the blaster tip, small blue energy bolt leaving the barrel.
Frame 3: recoil – blaster arm kicked slightly up and back, body leaning back a little, small fading flash.
Frame 4: recover – back to the aim pose, no flash.
Legs stay planted in the same position in all frames, only the arm, shoulders and head react to recoil.
```

---

## Если что-то пошло не так

- **Персонаж «плывёт» между кадрами.** Добавить в конец промпта:
  `Keep the character 100% identical to the reference in every frame.`
- **Модель путает число кадров.** Просить по 4 кадра за раз.

---

# Враг: зомби

Стиль тот же, что у героя, но персонаж другой. Поэтому референс героя (`8ace102b-….png`) прикладываем **только как образец стиля**, а не как замок на внешность. Порядок работы:

1. Сгенерировать **одного стоящего зомби** (промпт ниже), выбрать лучший вариант и сохранить как `zombie_ref.png`.
2. Все анимации генерировать, прикладывая **два файла**: `zombie_ref.png` (замок на персонажа) и референс героя (замок на стиль и масштаб).
3. Резать теми же скриптами: `slice_sheet.py`, затем `build_sprites.py`. Зомби должен быть того же роста, что герой, чтобы попасть в общую ячейку.

Зомби мультяшный и безобидный: ребёнку должно быть смешно, а не страшно. Без крови, ран, костей и оторванных частей.

## Референс зомби (один кадр)

Приложить референс героя.

```
Use the attached image ONLY as a style and scale reference. Do NOT draw the boy from the image. Draw a DIFFERENT character, a cartoon zombie, in exactly the same art style, same line weight, same proportions and the same overall height as the boy.

Character: a goofy friendly cartoon zombie, chibi proportions, oversized head about 1/2 of the body height, small body. Pale mint-green skin, short messy dark teal hair, one big round yellow eye wide open and the other eye half closed and droopy, small round nose, big dopey open-mouth grin with two crooked teeth, ears sticking out, tiny stitches on one cheek drawn as a simple cross. Torn dark purple t-shirt with jagged hem, gray-blue ragged shorts with a patch, mismatched socks (one green, one gray), brown worn shoes with dark soles. Both arms stretched straight forward in the classic zombie pose, hands hanging limp at the wrists. Slight slouch, knees a little bent, head tilted a bit to one side.

Style lock: thick uniform dark brown outlines, flat cel shading with exactly one shadow tone, clean vector game art, no gradients, no textures, no blood, no wounds, no bones, no gore, kid-friendly.

Format: full body, single character, side view facing RIGHT, feet flat on the ground, plain flat pure white background (#FFFFFF), no ground shadow, no text, no frame borders, nothing cropped.
```

**Варианты, если не нравится:** заменить цвет кожи на `pale lavender-gray`, причёску на `a single tuft of hair`, одежду на `a tattered gray suit jacket` (зомби-«офисный»). Один параметр за запрос, иначе персонаж уплывёт.

## Общий блок зомби (вставлять в начало каждого промпта анимации)

Приложить `zombie_ref.png` и референс героя.

```
Use the FIRST attached image as the strict character reference: draw EXACTLY the same zombie, same face, same proportions, same outfit, same colors. Use the SECOND attached image (the boy) ONLY as a style and scale reference: the zombie must be the same height as the boy and drawn in the same art style. Do not draw the boy.

Character lock: goofy friendly chibi cartoon zombie, oversized head, pale mint-green skin, short messy dark teal hair, one big round yellow eye and one droopy half-closed eye, big dopey open-mouth grin with two crooked teeth, cross-shaped stitches on one cheek, torn dark purple t-shirt, gray-blue ragged shorts with a patch, one green sock and one gray sock, brown worn shoes. Both arms stretched forward with limp hands.

Style lock: thick uniform dark brown outlines, flat cel shading with exactly one shadow tone, clean vector game art, no gradients, no textures, no motion blur, no blood, no gore, kid-friendly.

Sprite sheet format: one horizontal row of equally sized frames, the character is the same size and at the same scale in every frame, feet aligned on the same baseline, side view facing RIGHT, full body visible in every frame, nothing cropped, even spacing, plain flat pure white background (#FFFFFF), no ground shadow, no text, no numbers, no frame borders, no extra characters.
```

## Зомби: шарканье / walk (4 кадра)

Зомби ходит медленно и косолапо, поэтому 4 кадров на цикл достаточно (в игре ~6 fps). Если цикл выглядит рваным, просить 8 кадров сеткой 2×4 по схеме героя: те же четыре фазы, нижний ряд с поменянными ногами.

```
Animation: ZOMBIE SHUFFLE WALK, exactly 4 frames in one row, seamless loop, slow clumsy dragging walk.

NEAR leg = the leg closer to the viewer, drawn on top, normal colors (green sock). FAR leg = the leg behind it, one shade darker (gray sock). Keep this consistent in all frames.

Frame 1 CONTACT: near leg forward, knee slightly bent, heel on the ground; far leg stretched back, toe dragging on the ground. Body leans forward a little.
Frame 2 PASSING: near leg straight under the hips; far leg bent, foot lifted just a bit and passing behind the near leg. Body at its highest, head bobs up slightly.
Frame 3 CONTACT: far leg forward, heel on the ground; near leg stretched back, toe dragging. Same stride length as frame 1.
Frame 4 PASSING: far leg straight under the hips; near leg bent, foot lifted a bit and passing in front of the far leg.

UPPER BODY: both arms stay stretched forward in the zombie pose in every frame, hands limp, swaying slightly up and down together with the body bob (up in passing frames, down in contact frames). Head keeps the same tilt and the same dopey grin, mouth stays open. Vertical bob at most 4% of the character height.

LAYOUT: same character size in every frame, feet on one ground line, equal gaps, no frame overlaps.

FORBIDDEN: running, jumping, crouching, arms down at the sides, arms moving separately, both feet side by side, crossed legs, turning the head, changing the expression, changing the character's size.
```

## Зомби: получил выстрел и исчез / hit (4 кадра)

Воспроизводится один раз, потом спрайт удаляется из игры. Никаких падений лицом в пол и «смерти»: зомби удивляется, кружится и растворяется.

```
Animation: ZOMBIE HIT AND VANISH, exactly 4 frames in one row, plays once, silly and harmless.

Frame 1 SURPRISE: standing, both eyes wide open and round, mouth in a small "o", arms thrown up above the head, feet flat on the ground.
Frame 2 DIZZY: wobbling, knees knocked together, eyes drawn as spirals, tongue out, three small yellow stars circling above the head, arms flopping out to the sides.
Frame 3 FADING: same dizzy pose but the whole character is drawn 50% transparent (lighter, washed out) and slightly shrunk, stars still above the head, little puff clouds appearing at the feet.
Frame 4 GONE: the character is almost invisible (90% transparent, only a faint outline), a small puff of smoke and two tiny stars remain where the body was.

Feet stay on the same baseline in frames 1-3. Keep the character's size the same in frames 1 and 2.

FORBIDDEN: blood, wounds, bones, falling down, lying on the ground, scary expressions, changing the outfit.
```

**Если прозрачность не получается:** модели плохо рисуют полупрозрачность на белом фоне. Тогда просить только кадры 1 и 2, а растворение делать в игре через alpha и масштаб спрайта.

## Зомби влево

Как у героя: отзеркалить лист скриптом (`slice_sheet.py` делает это сам).

# Промпты для генерации спрайтов

Каждый файл — готовый промпт: общий блок уже вставлен, копировать целиком.
Подробные пояснения и что делать, если не получилось: ../animation_prompts.md

## hero/ — главный герой
К каждому запросу прикладывать референс героя: ../8ace102b-1098-47dc-b0d1-1a59d89edcf5.png

- idle.txt                          стойка, 4 кадра в ряд
- idle_blink_variant.txt            то же, кадр 3 с морганием
- walk_2x4.txt                      ходьба, 8 кадров сеткой 2×4
- walk_bottom_row_from_top_row.txt  дорисовать нижний ряд, приложив удачный верхний
- walk_fix_frame5_attach_f1_contact.txt  правка одного кадра, приложить ../walk_fix/f1_contact.png
- walk_fix_frame6_attach_f2_down.txt     правка одного кадра, приложить ../walk_fix/f2_down.png
- walk_left_if_not_mirrored.txt     ходьба влево, только если не зеркалим скриптом
- jump.txt                          прыжок, 6 кадров
- shoot.txt                         стрельба, 4 кадра
- single_frame_edit_template.txt    шаблон правки одного кадра
- 00_common_block.txt               общий блок отдельно

## zombie/ — враг
1. 00_reference_attach_hero.txt     один стоящий зомби; приложить референс героя. Результат сохранить как zombie_ref.png
2. walk.txt, hit.txt                приложить ДВА файла: zombie_ref.png и референс героя
- 00_common_block.txt               общий блок зомби отдельно

---
license: cc-by-nc-sa-4.0
language:
- vi
pretty_name: UIT-ViLipBTA
size_categories:
- 1K<n<10K
task_categories:
- text-classification
- token-classification
task_ids:
- multi-label-classification
- sentiment-classification
tags:
- aspect-based-sentiment-analysis
- absa
- brand-targeted-sentiment
- quadruple-extraction
- social-media
- tiktok
- vietnamese
- cosmetics
annotations_creators:
- machine-generated
- expert-generated
language_creators:
- found
multilinguality:
- monolingual
source_datasets:
- original
configs:
- config_name: default
  data_files:
  - split: train
    path: data/train.jsonl
  - split: validation
    path: data/validation.jsonl
  - split: test
    path: data/test.jsonl
dataset_info:
  features:
  - name: id
    dtype: string
  - name: video_id
    dtype: string
  - name: parent_id
    dtype: string
  - name: is_reply
    dtype: bool
  - name: context
    dtype: string
  - name: text
    dtype: string
  - name: quadruples
    list:
    - name: comment_type
      dtype: string
    - name: brand
      dtype: string
    - name: aspect
      dtype: string
    - name: sentiment
      dtype: string
  - name: label_source
    dtype: string
  splits:
  - name: train
    num_examples: 3403
  - name: validation
    num_examples: 487
  - name: test
    num_examples: 446
---
# UIT-ViLipBTA

**UIT-ViLipBTA** is a Vietnamese dataset for **Brand-Targeted Aspect-Based Sentiment Analysis (BT-ABSA)**, built from public TikTok comments about lip-care products (lip balms). Each comment is annotated with one or more quadruples:

```
(CommentType, Brand, Aspect, Sentiment)
```

Brand is an **open-vocabulary** element: users refer to brands through abbreviations (*ea* → Elizabeth Arden), product-line names (*lip monster* → Kate), misspellings (*vasaline* → Vaseline), or only through the parent comment they reply to. Replies are released together with their parent comment as conversational context.

- **Paper:** *UIT-ViLipBTA: A Vietnamese TikTok Dataset for Brand-Targeted ABSA in Lip-Care Product Discussions*, RIVF 2026
- **Authors:** Anh Thi-Hoang Nguyen, Dung Ha Nguyen (University of Information Technology, VNU-HCM)
- **Language:** Vietnamese (informal social-media register: teencode, abbreviations, missing diacritics, emoji)
- **License:** CC BY-NC-SA 4.0

## Quick start

```python
from datasets import load_dataset

ds = load_dataset("visolex/UIT-ViLipBTA")
ex = ds["train"][0]
print(ex["context"], "->", ex["text"])
print(ex["quadruples"])
```

## Dataset statistics

| Split           |       #Videos |       #Comments |     #Quadruples |      % Replies | Labels |
| --------------- | ------------: | --------------: | --------------: | -------------: | ------ |
| train           |           107 |           3,403 |           4,748 |           39.3 | silver |
| validation      |            16 |             487 |             677 |           34.7 | silver |
| test            |            12 |             446 |             518 |           39.0 | gold   |
| **Total** | **135** | **4,336** | **5,943** | **38.7** |        |

Comments span June 2022 – September 2025. The split is **by video**: no video contributes comments to more than one split, so every reply sits in the same split as its parent. The partition was selected from 800 random permutations to minimise divergence of the aspect, sentiment and reply distributions from the full corpus.

### CommentType

| CommentType    | #Quadruples |    % |
| -------------- | ----------: | ---: |
| ProductReview  |       5,000 | 84.1 |
| OutOfDomain    |         652 | 11.0 |
| ContentCreator |         171 |  2.9 |
| VideoContent   |         120 |  2.0 |

62 comments carry more than one CommentType, so CommentType classification is multi-label.

### Aspect × Sentiment (ProductReview quadruples)

| Aspect            | Positive | Negative | Neutral | Total |
| ----------------- | -------: | -------: | ------: | ----: |
| GeneralExperience |    1,352 |      262 |     124 | 1,738 |
| Benefits          |      813 |      269 |      74 | 1,156 |
| Color             |      442 |      166 |     134 |   742 |
| SideEffects       |       18 |      311 |       6 |   335 |
| Price             |      125 |      109 |      23 |   257 |
| Texture           |       76 |      125 |      35 |   236 |
| Longevity         |       79 |      104 |      21 |   204 |
| Scent             |      115 |       57 |      23 |   195 |
| Packaging         |       62 |       26 |      18 |   106 |
| Ingredients       |       24 |        3 |       4 |    31 |

The distribution is long-tailed (the top three aspects cover 72.7% of quadruples) and polarity is strongly tied to aspect (*SideEffects* is 92.8% negative). Report per-class or macro scores alongside micro-F1.

Brand frequency is Zipfian: 2,565 ProductReview quadruples carry `General` (no specific brand), and the remainder spread over a long tail of brands, many appearing only once or twice.

## Data fields

| Field            | Type   | Description                                                                                                                  |
| ---------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`           | string | Anonymised comment identifier (keyed hash of the TikTok comment ID)                                                          |
| `video_id`     | string | Anonymised identifier of the source video. Use it to group comments by thread; never split a video across train and test     |
| `parent_id`    | string | Anonymised identifier of the parent comment for replies, empty otherwise. The parent is not necessarily a row in the dataset |
| `is_reply`     | bool   | Whether the comment is a reply                                                                                               |
| `context`      | string | Text of the parent comment for replies, empty otherwise                                                                      |
| `text`         | string | The comment text                                                                                                             |
| `quadruples`   | list   | One or more `{comment_type, brand, aspect, sentiment}` records                                                             |
| `label_source` | string | `silver` (LLM-assisted with human review of disagreements) or `gold` (blind triple annotation + adjudication)            |

### Label space

| Element          | Values                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `comment_type` | `ProductReview`, `ContentCreator`, `VideoContent`, `OutOfDomain`                                                                                                           |
| `brand`        | Canonical brand name (open vocabulary), `General` (lip-care product without a specific brand), or `None` (non-ProductReview)                                                   |
| `aspect`       | `GeneralExperience`, `Benefits`, `Color`, `SideEffects`, `Price`, `Texture`, `Longevity`, `Scent`, `Packaging`, `Ingredients`, or `None` (non-ProductReview) |
| `sentiment`    | `Positive`, `Negative`, `Neutral`, or `None` (OutOfDomain only)                                                                                                            |

Structural constraints:

- `ProductReview` → `(ProductReview, <brand|General>, <aspect>, <Positive|Negative|Neutral>)`
- `ContentCreator` / `VideoContent` → `(type, None, None, <Positive|Negative|Neutral>)`
- `OutOfDomain` → `(OutOfDomain, None, None, None)`

`None` is stored as the string `"None"`, not as null.

### Example

```json
{
  "id": "d0d148df59f2a0f4",
  "video_id": "addd6272a1313d72",
  "parent_id": "2971f53869e900b1",
  "is_reply": true,
  "context": "Đỏ gạch thì màu số bnhiu vậy ạ",
  "text": "Tui mua Roman 029 thấy đánh OK lắm 😉😉😉",
  "quadruples": [
    {"comment_type": "ProductReview", "brand": "Roman", "aspect": "Color", "sentiment": "Positive"}
  ],
  "label_source": "gold"
}
```

## Additional files

| File                                     | Description                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand_dict.json`                      | Brand normalisation dictionary: surface form (lower-cased) → canonical brand. 117 canonical brands. Required for the *normalized match* metric |
| `guidelines/btabsa_guidelines_vi.docx` | Annotation guideline (Vietnamese)                                                                                                                 |

## Tasks and evaluation

Given a comment *c* and, for replies, its parent *p*:

- **Task 1 — CommentType classification:** predict the set of comment types (multi-label). Micro/macro F1.
- **Task 2 — Aspect–Sentiment pair extraction:** predict the set of `(aspect, sentiment)` pairs of ProductReview quadruples. Micro/macro F1.
- **Task 3 — Quadruple extraction:** predict the full set of quadruples. F1 at three match levels:
  - *Exact*: raw string equality on all four elements.
  - *Normalized*: gold and predicted brands are both mapped through `brand_dict.json` before comparison.
  - *Triplet*: brand dropped; `(comment_type, aspect, sentiment)` must match.

### Baseline results (test set, mean over 3 seeds)

| Task   | Metric                | Best model                       | Score |
| ------ | --------------------- | -------------------------------- | ----: |
| Task 1 | Micro-F1              | XLM-R (majority baseline: 0.705) | 0.748 |
| Task 2 | Micro-F1              | ViSoBERT                         | 0.611 |
| Task 3 | Normalized F1         | ViSoBERT                         | 0.518 |
| Task 3 | Exact F1              | BARTpho-syllable                 | 0.471 |
| Human  | Pairwise quadruple F1 | 3 annotators                     | 0.649 |

Adding the parent comment as context improves ViSoBERT's Task 3 normalized F1 by 0.080 overall and by 0.154 on replies. See the paper for the full tables.

## Dataset creation

### Collection

Public Vietnamese comments were collected from 135 TikTok videos about lip-care products, found through product-related search queries. For each video, up to 200 top-level comments and their replies with language tag `vi` were kept. Five copy-pasted spam comments were removed, and texts duplicated across splits were removed from the lower-priority split (priority test > validation > train). Duplicates within a split were kept because they come from different users or videos.

### Annotation

1. A guideline was refined on a pilot of 100 comments annotated by two members of the research team.
2. The remaining comments were annotated independently by two to three large language models each. High-agreement cases were accepted; disagreements were resolved by human annotators. These are the **silver** labels in train and validation.
3. Brand labels were normalised with a 126-entry dictionary (326 observed ProductReview surface forms → 117 canonical brands).
4. **Test set (gold):** three trained annotators re-annotated all 446 test comments from scratch, blind to existing labels. Disagreements were resolved by majority vote, then expert adjudication.
5. Systematic errors found during adjudication (e.g., product-line names missing from the dictionary) were fixed as dictionary entries and guideline rules and re-applied to all splits. No adjudicated test label was copied into training data.

### Annotation quality

| Measure                                                    | Value |
| ---------------------------------------------------------- | ----: |
| Fleiss κ — CommentType (macro over labels)               | 0.513 |
| Fleiss κ — Aspect                                        | 0.697 |
| Fleiss κ — Sentiment                                     | 0.634 |
| Pairwise quadruple F1 between annotators                   | 0.649 |
| Silver vs. gold, full quadruple F1 (test, n = 446)         | 0.604 |
| Silver vs. gold, full quadruple F1 (train sample, n = 554) | 0.583 |

The low CommentType κ is driven by *ContentCreator* (κ = 0.175, assigned only 11 times across three annotators); the main substantive disagreement is the ProductReview/OutOfDomain boundary, e.g., resale offers that mention a product without evaluating it.

## Limitations and known issues

- **Train and validation labels are silver.** They agree with gold at about 0.58–0.60 quadruple F1. Treat the test set as the only gold-standard evaluation.
- **Annotation provenance was not preserved** per sample: it is not recorded which silver labels were accepted from model agreement and which were decided by a human.
- **Four gold test brands are surface forms rather than canonical names:** `029` (a shade code), `Sài` (the verb *xài*, "to use"), `toboco` (likely Tocobo), and `wrinkle plus alpha cx`. They were kept unchanged so that the paper's results stay reproducible.
- **Single domain and platform.** The data covers lip-care products on TikTok only; transfer to other categories or platforms has not been evaluated.
- Brand names appear as part of users' opinions. They do not reflect any assessment by the authors.

## Ethical considerations and privacy

- Only comments that were public at collection time are included. No user profiles, usernames, avatars or video content are released.
- User IDs, timestamps and engagement counts were removed. Comment, parent and video IDs were replaced by keyed hashes (HMAC-SHA256 with a secret key), so they cannot be mapped back to TikTok IDs. Reply structure is still preserved.
- Comment text is released verbatim, including any @mentions users typed, and may still be searchable on TikTok. If you find your own comment in the dataset and want it removed, contact the authors (see below) and it will be removed in the next version.
- The dataset is for **non-commercial research** only (CC BY-NC-SA 4.0).

## Citation

```bibtex
@inproceedings{nguyen2026uitvilipbta,
  title     = {{UIT-ViLipBTA}: A Vietnamese {TikTok} Dataset for Brand-Targeted {ABSA} in Lip-Care Product Discussions},
  author    = {Nguyen, Anh Thi-Hoang and Nguyen, Dung Ha},
  booktitle = {Proceedings of the 2026 RIVF International Conference on Computing and Communication Technologies (RIVF)},
  year      = {2026},
  publisher = {IEEE}
}
```

## Contact

Anh Thi-Hoang Nguyen — anhnth@uit.edu.vn
Dung Ha Nguyen — dungngh@uit.edu.vn

## Acknowledgement

This research was supported by The VNUHCM-University of Information Technology's Scientific Research Support Fund.

"""A small, transparent recruitment and candidate shortlisting app.

Uses only the Python standard library. Run with: python recruitment_shortlisting.py
Candidate data is stored beside this script in candidates.json.
"""

import csv
import json
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path


DATA_FILE = Path(__file__).with_name("candidates.json")


def split_skills(value):
    return {part.strip().casefold() for part in value.replace(";", ",").split(",") if part.strip()}


def score_candidate(candidate, required, preferred, minimum_years):
    skills = split_skills(candidate.get("skills", ""))
    required_hit = len(required & skills) / len(required) if required else 1.0
    preferred_hit = len(preferred & skills) / len(preferred) if preferred else 1.0
    years = max(0.0, float(candidate.get("experience", 0) or 0))
    experience_hit = min(years / minimum_years, 1.0) if minimum_years > 0 else 1.0
    score = round(100 * (0.60 * required_hit + 0.20 * preferred_hit + 0.20 * experience_hit))
    missing = sorted(required - skills)
    reasons = [f"Required skills: {round(required_hit * 100)}%", f"Preferred skills: {round(preferred_hit * 100)}%",
               f"Experience: {years:g} of {minimum_years:g} years" if minimum_years else f"Experience: {years:g} years"]
    return score, missing, " | ".join(reasons)


class RecruitmentApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Recruitment & Shortlisting")
        self.geometry("1080x680")
        self.minsize(850, 540)
        self.candidates = self.load_data()
        self.build_ui()
        self.refresh()

    def load_data(self):
        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    def save_data(self):
        DATA_FILE.write_text(json.dumps(self.candidates, indent=2), encoding="utf-8")

    def build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)
        criteria = ttk.LabelFrame(self, text="Role requirements (comma-separated skills)", padding=10)
        criteria.grid(row=0, column=0, sticky="ew", padx=12, pady=(12, 6))
        criteria.columnconfigure(1, weight=1)
        criteria.columnconfigure(3, weight=1)
        self.required_var = tk.StringVar()
        self.preferred_var = tk.StringVar()
        self.years_var = tk.StringVar(value="2")
        ttk.Label(criteria, text="Required:").grid(row=0, column=0, sticky="w")
        ttk.Entry(criteria, textvariable=self.required_var).grid(row=0, column=1, sticky="ew", padx=(6, 14))
        ttk.Label(criteria, text="Preferred:").grid(row=0, column=2, sticky="w")
        ttk.Entry(criteria, textvariable=self.preferred_var).grid(row=0, column=3, sticky="ew", padx=6)
        ttk.Label(criteria, text="Minimum years:").grid(row=0, column=4, sticky="w", padx=(10, 4))
        ttk.Entry(criteria, textvariable=self.years_var, width=6).grid(row=0, column=5)
        ttk.Button(criteria, text="Update ranking", command=self.refresh).grid(row=0, column=6, padx=(12, 0))

        toolbar = ttk.Frame(self, padding=(12, 5))
        toolbar.grid(row=1, column=0, sticky="ew")
        ttk.Button(toolbar, text="Add candidate", command=self.add_candidate).pack(side="left")
        ttk.Button(toolbar, text="Edit selected", command=self.edit_candidate).pack(side="left", padx=6)
        ttk.Button(toolbar, text="Delete selected", command=self.delete_candidate).pack(side="left")
        ttk.Button(toolbar, text="Import CSV", command=self.import_csv).pack(side="left", padx=(18, 6))
        ttk.Button(toolbar, text="Export ranked CSV", command=self.export_csv).pack(side="left")

        area = ttk.Frame(self, padding=(12, 4, 12, 8))
        area.grid(row=2, column=0, sticky="nsew")
        area.rowconfigure(0, weight=1)
        area.columnconfigure(0, weight=1)
        cols = ("score", "name", "email", "experience", "skills", "missing", "status")
        self.tree = ttk.Treeview(area, columns=cols, show="headings", selectmode="browse")
        headers = {"score": "Score", "name": "Candidate", "email": "Email", "experience": "Years",
                   "skills": "Skills", "missing": "Missing required skills", "status": "Decision"}
        widths = {"score": 65, "name": 145, "email": 180, "experience": 65, "skills": 220, "missing": 190, "status": 100}
        for col in cols:
            self.tree.heading(col, text=headers[col], command=lambda c=col: self.sort_by(c))
            self.tree.column(col, width=widths[col], minwidth=55, anchor="w")
        self.tree.column("score", anchor="center")
        self.tree.column("experience", anchor="center")
        self.tree.grid(row=0, column=0, sticky="nsew")
        scrollbar = ttk.Scrollbar(area, orient="vertical", command=self.tree.yview)
        scrollbar.grid(row=0, column=1, sticky="ns")
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.bind("<Double-1>", lambda _event: self.edit_candidate())
        self.summary = tk.StringVar()
        ttk.Label(self, textvariable=self.summary, padding=(12, 5), wraplength=1040).grid(row=3, column=0, sticky="w")
        ttk.Label(self, text="Ranking is a transparent aid, not an automated hiring decision. Review applications consistently and assess candidates individually.",
                  foreground="#555", padding=(12, 2, 12, 10), wraplength=1040).grid(row=4, column=0, sticky="w")

    def get_min_years(self):
        try:
            value = float(self.years_var.get())
            if value < 0:
                raise ValueError
            return value
        except ValueError:
            raise ValueError("Minimum years must be a non-negative number.")

    def ranked(self):
        required, preferred = split_skills(self.required_var.get()), split_skills(self.preferred_var.get())
        years = self.get_min_years()
        results = []
        for idx, person in enumerate(self.candidates):
            score, missing, explanation = score_candidate(person, required, preferred, years)
            results.append((idx, person, score, missing, explanation))
        return sorted(results, key=lambda row: (-row[2], row[1].get("name", "").casefold()))

    def refresh(self):
        try:
            ranked = self.ranked()
        except ValueError as exc:
            messagebox.showerror("Check role requirements", str(exc))
            return
        self.tree.delete(*self.tree.get_children())
        threshold = 70
        for idx, person, score, missing, _ in ranked:
            self.tree.insert("", "end", iid=str(idx), values=(score, person.get("name", ""), person.get("email", ""),
                              person.get("experience", 0), person.get("skills", ""), ", ".join(missing) or "None", "Review" if score >= threshold else "Below threshold"))
        self.summary.set(f"{len(ranked)} candidate(s) • {sum(1 for row in ranked if row[2] >= threshold)} score at or above 70 (suggested for review) • Score: 60% required skills, 20% preferred skills, 20% experience")

    def sort_by(self, col):
        children = list(self.tree.get_children())
        def key(iid):
            val = self.tree.set(iid, col)
            try:
                return float(val)
            except ValueError:
                return val.casefold()
        children.sort(key=key, reverse=getattr(self, "_reverse_" + col, col == "score"))
        setattr(self, "_reverse_" + col, not getattr(self, "_reverse_" + col, col == "score"))
        for pos, iid in enumerate(children):
            self.tree.move(iid, "", pos)

    def selected_index(self):
        selection = self.tree.selection()
        if not selection:
            messagebox.showinfo("Select a candidate", "Choose a candidate first.")
            return None
        return int(selection[0])

    def candidate_dialog(self, candidate=None):
        dialog = tk.Toplevel(self)
        dialog.title("Edit candidate" if candidate else "Add candidate")
        dialog.transient(self)
        dialog.grab_set()
        fields = [("Full name", "name"), ("Email", "email"), ("Experience in years", "experience"), ("Skills (comma-separated)", "skills"), ("Notes", "notes")]
        vars_ = {}
        for row, (label, key) in enumerate(fields):
            ttk.Label(dialog, text=label).grid(row=row, column=0, padx=10, pady=6, sticky="w")
            var = tk.StringVar(value=str((candidate or {}).get(key, "")))
            vars_[key] = var
            ttk.Entry(dialog, textvariable=var, width=48).grid(row=row, column=1, padx=10, pady=6, sticky="ew")
        def save():
            name = vars_["name"].get().strip()
            if not name:
                messagebox.showerror("Name required", "Enter the candidate's name.", parent=dialog)
                return
            try:
                exp = float(vars_["experience"].get() or 0)
                if exp < 0:
                    raise ValueError
            except ValueError:
                messagebox.showerror("Invalid experience", "Enter a non-negative number of years.", parent=dialog)
                return
            result = {key: vars_[key].get().strip() for _, key in fields}
            result["experience"] = exp
            dialog.result = result
            dialog.destroy()
        buttons = ttk.Frame(dialog)
        buttons.grid(row=len(fields), column=0, columnspan=2, pady=10)
        ttk.Button(buttons, text="Save", command=save).pack(side="left", padx=5)
        ttk.Button(buttons, text="Cancel", command=dialog.destroy).pack(side="left", padx=5)
        dialog.wait_window()
        return getattr(dialog, "result", None)

    def add_candidate(self):
        person = self.candidate_dialog()
        if person:
            self.candidates.append(person)
            self.save_data()
            self.refresh()

    def edit_candidate(self):
        idx = self.selected_index()
        if idx is None:
            return
        person = self.candidate_dialog(self.candidates[idx])
        if person:
            self.candidates[idx] = person
            self.save_data()
            self.refresh()

    def delete_candidate(self):
        idx = self.selected_index()
        if idx is not None and messagebox.askyesno("Delete candidate", f"Delete {self.candidates[idx].get('name', 'this candidate')}?"):
            del self.candidates[idx]
            self.save_data()
            self.refresh()

    def import_csv(self):
        path = filedialog.askopenfilename(filetypes=[("CSV files", "*.csv"), ("All files", "*.*")])
        if not path:
            return
        try:
            with open(path, newline="", encoding="utf-8-sig") as f:
                rows = list(csv.DictReader(f))
            added = 0
            for row in rows:
                normalized = {str(k).strip().casefold(): (v or "").strip() for k, v in row.items() if k}
                name = normalized.get("name") or normalized.get("full name") or normalized.get("candidate")
                if not name:
                    continue
                try:
                    experience = float(normalized.get("experience", normalized.get("experience years", "0")) or 0)
                except ValueError:
                    experience = 0
                self.candidates.append({"name": name, "email": normalized.get("email", ""), "experience": max(0, experience),
                                        "skills": normalized.get("skills", ""), "notes": normalized.get("notes", "")})
                added += 1
            self.save_data()
            self.refresh()
            messagebox.showinfo("Import complete", f"Imported {added} candidate(s). Expected headers include name, email, experience, skills, notes.")
        except (OSError, csv.Error) as exc:
            messagebox.showerror("Import failed", str(exc))

    def export_csv(self):
        try:
            ranked = self.ranked()
        except ValueError as exc:
            messagebox.showerror("Check role requirements", str(exc))
            return
        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV files", "*.csv")], initialfile="ranked_candidates.csv")
        if not path:
            return
        try:
            with open(path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(["rank", "score", "name", "email", "experience_years", "skills", "missing_required_skills", "scoring_explanation", "notes"])
                for rank, (_, person, score, missing, explanation) in enumerate(ranked, 1):
                    writer.writerow([rank, score, person.get("name", ""), person.get("email", ""), person.get("experience", 0), person.get("skills", ""), ", ".join(missing), explanation, person.get("notes", "")])
            messagebox.showinfo("Export complete", f"Exported {len(ranked)} ranked candidates.")
        except OSError as exc:
            messagebox.showerror("Export failed", str(exc))


if __name__ == "__main__":
    RecruitmentApp().mainloop()

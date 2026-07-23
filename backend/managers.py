import json
from pathlib import Path
from typing import Dict, List, Optional

from templates.models import Template, TemplateVariable


class TemplateManager:
    """Manage templates."""

    def __init__(self, template_dir: str = "./templates"):
        self.template_dir = Path(template_dir)
        self.template_dir.mkdir(exist_ok=True)

        # Create default categories
        self.categories = ["professional", "creative", "academic", "cover-letter", "blank"]
        for category in self.categories:
            (self.template_dir / category).mkdir(exist_ok=True)

    def load_template(self, template_id: str) -> Optional[Template]:
        """Load template from JSON file."""
        for category in self.categories:
            template_file = self.template_dir / category / f"{template_id}.json"
            if template_file.exists():
                with open(template_file, 'r') as f:
                    data = json.load(f)
                    return Template(**data)
        return None

    def list_templates(self, category: Optional[str] = None) -> List[Template]:
        """List all templates or filter by category."""
        templates = []

        if category:
            search_dirs = [self.template_dir / category]
        else:
            search_dirs = [self.template_dir / cat for cat in self.categories]

        for dir_path in search_dirs:
            if dir_path.exists():
                for file_path in dir_path.glob("*.json"):
                    try:
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            templates.append(Template(**data))
                    except Exception as e:
                        print(f"Error loading {file_path}: {e}")

        return templates

    def fill_template(self, template_id: str, data: Dict[str, str]) -> str:
        """Replace variables in template with user data."""
        template = self.load_template(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")

        tex_content = template.tex_content
        
        # Replace {{variable}} with user data
        for var_name, var_value in data.items():
            placeholder = f"{{{{{var_name}}}}}"
            tex_content = tex_content.replace(placeholder, var_value)

        return tex_content

    def create_default_templates(self):
        """Create initial templates if none exist."""
        # if any(self.template_dir.rglob("*.json")):
        #     return  # Templates already exist
        
        # Modern Professional Template
        modern_template = Template(
            id="modern_professional",
            name="Modern Professional",
            description="Clean, contemporary design with emphasis on skills",
            category="professional",
            tex_content="""\\documentclass[a4paper,10pt]{article}
\\usepackage{fontspec}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\geometry{margin=0.75in}
\\setlist{noitemsep}
\\setlength{\\parskip}{4pt}

% Colors
\\definecolor{accent}{RGB}{41, 128, 185}

% Font
\\setmainfont{{{font}}}

\\begin{document}

\\begin{center}
    {\\color{accent}\\Huge\\textbf{{{name}}}}
    \\vspace{4pt}

    \\small
    \\href{mailto:{{email}}}{📧 {{email}}} | 
    \\href{tel:{{phone}}}{📱 {{phone}}} | 
    \\href{{{linkedin}}}{💼 LinkedIn} | 
    \\href{{{github}}}{🐙 GitHub}
    \\vspace{8pt}

    \\rule{\\textwidth}{0.5pt}
\\end{center}

\\vspace{-10pt}
\\section*{{\\color{accent}🎯 Professional Summary}}
{{summary}}

\\section*{{\\color{accent}💼 Experience}}
\\begin{itemize}[leftmargin=*]
{{experience}}
\\end{itemize}

\\section*{{\\color{accent}🎓 Education}}
\\begin{itemize}[leftmargin=*]
{{education}}
\\end{itemize}

\\section*{{\\color{accent}🛠️ Technical Skills}}
\\begin{itemize}[leftmargin=*]
{{skills}}
\\end{itemize}

\\section*{{\\color{accent}🏆 Projects}}
\\begin{itemize}[leftmargin=*]
{{projects}}
\\end{itemize}

\\end{document}""",
            variables={
                "name": TemplateVariable(name="name", label="Full Name", default="John Doe"),
                "email": TemplateVariable(name="email", label="Email", default="john@example.com"),
                "phone": TemplateVariable(name="phone", label="Phone", default="+1 (123) 456-7890"),
                "linkedin": TemplateVariable(name="linkedin", label="LinkedIn URL", default="linkedin.com/in/johndoe"),
                "github": TemplateVariable(name="github", label="GitHub URL", default="github.com/johndoe"),
                "summary": TemplateVariable(name="summary", label="Professional Summary", 
                                          default="Experienced software engineer with 5+ years in full-stack development...", 
                                          type="multiline"),
                "experience": TemplateVariable(name="experience", label="Experience Items", 
                                             default="\\item \\textbf{Senior Software Engineer} at TechCorp (2020-Present)\\newline Led team of 5 developers...", 
                                             type="multiline"),
                "education": TemplateVariable(name="education", label="Education", 
                                            default="\\item \\textbf{M.S. Computer Science}, Stanford University (2018)\\newline GPA: 3.9/4.0", 
                                            type="multiline"),
                "skills": TemplateVariable(name="skills", label="Skills", 
                                         default="\\item \\textbf{Languages}: Python, JavaScript, TypeScript, Go\\newline \\textbf{Frameworks}: React, Node.js, Django, FastAPI", 
                                         type="multiline"),
                "projects": TemplateVariable(name="projects", label="Projects", 
                                           default="\\item \\textbf{Resume Builder} - Open-source LaTeX resume builder with real-time preview", 
                                           type="multiline")
            },
            font="Liberation Sans",
            created_at="2024-01-01",
            updated_at="2024-01-01",
            is_free=True
        )

        # Save to file
        template_path = self.template_dir / "professional" / "modern_professional.json"
        with open(template_path, 'w') as f:
            json.dump(modern_template.model_dump(), f, indent=2)

        # Create Classic Template
        classic_template = Template(
            id="classic_elegant",
            name="Classic Elegant",
            description="Traditional two-column layout with formal styling",
            category="professional",
            tex_content="""\\documentclass[a4paper,11pt]{article}
\\usepackage{fontspec}
\\usepackage{geometry}
\\usepackage{tabularx}
\\usepackage{ragged2e}
\\usepackage{parskip}

\\geometry{margin=1in}
\\setlength{\\parskip}{6pt}

% Two columns
\\usepackage{multicol}
\\setlength{\\columnsep}{1cm}

\\setmainfont{{{font}}}

\\begin{document}

\\begin{center}
    {\\LARGE\\textbf{{{name}}}}
    \\vspace{6pt}
    
    \\small
    {email} | {phone} | {location}
\\end{center}

\\vspace{10pt}

\\begin{multicols}{2}

\\section*{Contact}
\\begin{tabular}{@{}l@{}}
Email: {{var}}\\\\
Phone: {{var}}\\\\
Location: {{var}}\\\\
LinkedIn: {{var}}\\\\
GitHub: {{var}}
\\end{tabular}

\\section*{Education}
{{education}}

\\section*{Skills}
{{skills}}

\\columnbreak

\\section*{Experience}
{{experience}}

\\section*{Certifications}
{{certifications}}

\\end{multicols}

\\section*{Professional Summary}
{{summary}}

\\end{document}""",
            variables={
                "name": TemplateVariable(name="name", label="Full Name"),
                "email": TemplateVariable(name="email", label="Email"),
                "phone": TemplateVariable(name="phone", label="Phone"),
                "location": TemplateVariable(name="location", label="Location"),
                "linkedin": TemplateVariable(name="linkedin", label="LinkedIn"),
                "github": TemplateVariable(name="github", label="GitHub"),
                "summary": TemplateVariable(name="summary", label="Summary", type="multiline"),
                "education": TemplateVariable(name="education", label="Education", type="multiline"),
                "experience": TemplateVariable(name="experience", label="Experience", type="multiline"),
                "skills": TemplateVariable(name="skills", label="Skills", type="multiline"),
                "certifications": TemplateVariable(name="certifications", label="Certifications", type="multiline")
            },
            font="Liberation Serif",
            created_at="2024-01-01",
            updated_at="2024-01-01",
            is_free=True
        )
        
        classic_path = self.template_dir / "professional" / "classic_elegant.json"
        with open(classic_path, 'w') as f:
            json.dump(classic_template.model_dump(), f, indent=2)

        # ---- Cover Letter Template ----
        cover_letter = Template(
            id="cover_letter_standard",
            name="Professional Cover Letter",
            description="Standard business letter format for job applications",
            category="cover-letter",
            tex_content="""\\documentclass[a4paper,11pt]{letter}
\\usepackage{fontspec}
\\usepackage{geometry}
\\usepackage{parskip}
\\usepackage{hyperref}

\\geometry{margin=1in}
\\setlength{\\parskip}{6pt}

\\setmainfont{{{font}}}

\\begin{document}

\\begin{flushright}
    {\\bfseries {{sender_name}}}\\\\
    {{sender_address}}\\\\
    {{sender_city}}, {{sender_postal_code}}\\\\
    \\href{{mailto:{sender_email}}}{{{sender_email}}}\\\\
    \\href{{tel:{sender_phone}}}{{{sender_phone}}}
\\end{flushright}

\\vspace{12pt}

\\begin{flushleft}
    {{recipient_name}}\\\\
    {{recipient_title}}\\\\
    {{recipient_company}}\\\\
    {{recipient_address}}\\\\
    {{recipient_city}}, {{recipient_postal_code}}
\\end{flushleft}

\\vspace{12pt}

{{date}}

\\vspace{12pt}

\\textbf{Re: {{subject}}}

\\vspace{12pt}

{{opening}}

\\vspace{6pt}

{{body_first}}

\\vspace{6pt}

{{body_second}}

\\vspace{6pt}

{{body_third}}

\\vspace{12pt}

{{closing}}

\\vspace{24pt}

\\hspace{2in}
{{sender_name}}

\\end{document}""",
            variables={
                "sender_name": TemplateVariable(
                    name="sender_name",
                    label="Your Full Name",
                    default="Jane Doe",
                    type="text",
                ),
                "sender_address": TemplateVariable(
                    name="sender_address",
                    label="Your Street Address",
                    default="123 Main Street",
                    type="text",
                ),
                "sender_city": TemplateVariable(
                    name="sender_city",
                    label="Your City",
                    default="Johannesburg",
                    type="text",
                ),
                "sender_postal_code": TemplateVariable(
                    name="sender_postal_code",
                    label="Your Postal Code",
                    default="2001",
                    type="text",
                ),
                "sender_email": TemplateVariable(
                    name="sender_email",
                    label="Your Email",
                    default="jane@example.com",
                    type="text",
                ),
                "sender_phone": TemplateVariable(
                    name="sender_phone",
                    label="Your Phone",
                    default="+27 82 123 4567",
                    type="text",
                ),
                "recipient_name": TemplateVariable(
                    name="recipient_name",
                    label="Recipient Name",
                    default="Dr. John Smith",
                    type="text",
                ),
                "recipient_title": TemplateVariable(
                    name="recipient_title",
                    label="Recipient Title",
                    default="Hiring Manager",
                    type="text",
                ),
                "recipient_company": TemplateVariable(
                    name="recipient_company",
                    label="Company Name",
                    default="TechCorp Ltd.",
                    type="text",
                ),
                "recipient_address": TemplateVariable(
                    name="recipient_address",
                    label="Company Address",
                    default="456 Business Avenue",
                    type="text",
                ),
                "recipient_city": TemplateVariable(
                    name="recipient_city",
                    label="Company City",
                    default="Cape Town",
                    type="text",
                ),
                "recipient_postal_code": TemplateVariable(
                    name="recipient_postal_code",
                    label="Company Postal Code",
                    default="8001",
                    type="text",
                ),
                "date": TemplateVariable(
                    name="date",
                    label="Date",
                    default="\\today",
                    type="text",
                ),
                "subject": TemplateVariable(
                    name="subject",
                    label="Subject Line",
                    default="Application for Software Engineer Position",
                    type="text",
                ),
                "opening": TemplateVariable(
                    name="opening",
                    label="Salutation / Opening",
                    default="Dear Dr. Smith,",
                    type="text",
                ),
                "body_first": TemplateVariable(
                    name="body_first",
                    label="Body Paragraph 1",
                    default="I am writing to express my strong interest in the Software Engineer position at TechCorp. With over five years of experience building scalable web applications and a passion for elegant system design, I am confident that my skills align perfectly with your team's needs.",
                    type="multiline",
                ),
                "body_second": TemplateVariable(
                    name="body_second",
                    label="Body Paragraph 2",
                    default="In my current role at InnovateTech, I spearheaded the development of a real-time analytics platform that reduced customer churn by 15%. I led a cross-functional team of eight engineers, modernised our CI/CD pipeline, and introduced automated testing that cut deployment failures by 40%.",
                    type="multiline",
                ),
                "body_third": TemplateVariable(
                    name="body_third",
                    label="Body Paragraph 3",
                    default="I am particularly drawn to TechCorp's commitment to open-source software and developer experience. I have been a long-time user of your tools and would be thrilled to contribute to the team that builds them.",
                    type="multiline",
                ),
                "closing": TemplateVariable(
                    name="closing",
                    label="Closing",
                    default="Thank you for considering my application. I look forward to discussing how my experience can contribute to TechCorp's continued success.",
                    type="multiline",
                ),
            },
            font="Liberation Serif",
            created_at="2024-01-01",
            updated_at="2024-01-01",
            is_free=True,
        )

        cover_letter_path = self.template_dir / "cover-letter" / "cover_letter_standard.json"
        cover_letter_path.parent.mkdir(exist_ok=True)
        with open(cover_letter_path, 'w') as f:
            json.dump(cover_letter.model_dump(), f, indent=2)
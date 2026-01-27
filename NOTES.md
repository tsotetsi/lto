
#### Tutorial(s) - Snippets

1. Basic Latex document templating engine parsing.

    https://www.overleaf.com/learn/latex/Learn_LaTeX_in_30_minutes#What_is_LaTeX?

```latex
    \documentclass[12pt, letterpaper]{article}
    \title{My frist Latex document templating engine parsing.}
    \author{Thapelo Tsotetsi\thanks{Funded by AirwaveIOteam}}
    \date{January 2026}
    \begin{document}
    \maketitle
    We have now added a title, author and date to our first \LaTeX{} document!
    % This line here is a comment. It will not be typeset in the document.

    Some of the \textbf{greatest}
    discoveries in \underline{science} 
    were made by \textbf{\textit{accident}}.

    \end{document}
```

2. Setting fonts for different Latext elements. 

    https://www.overleaf.com/learn/latex/XeLaTeX#Introduction

    In this example three different fonts, explicity declared by the ```\ssfamily``` command.
    It set will typeset the document with **Arial** font.

    ```latex 
        \setmonofont{Courier New}
    ```
    Everything to be formatted with a monospaced ```(typewriter-like)``` font will use the **Courier New font**. This command has an extra optional parameter inside braces:
    
    ```bash
        Color={0019D4}
    ```
    This sets the colour of the text, using a Color= value using the hexadecimal HTML format. Selective and careful use of text colour can be useful when making a presentation.

```latex
\documentclass[12pt]{article}
\usepackage{fontspec}

%-----------------------------------------------------------------------
\setmainfont{Times New Roman}
\setsansfont{Arial}
\setmonofont[Color={0019D4}]{Courier New}
%-----------------------------------------------------------------------

\title{Sample font document}
\author{Overleaf}
\date{\today}
\begin{document}
    
\maketitle
     
This an \textit{example} of document compiled with the  
\textbf{XeLaTeX} compiler. If you have to write some code you can 
use the \texttt{verbatim} environment:

    \begin{verbatim}
    Usually this environment is used to display code, 
    so here's a simple C program.

    #include <stdio.h>
    #define NUMYAYS 10
      
    int main()
    {
        int i;   
        for (i = 0; i <= NUMYAYS; i++) 
        {
            printf("Yay! Overleaf is Awesome!\n");
        }
        return 0;
    }
    \end{verbatim}
    {\sffamily This is a sample text in \textbf{Sans Serif Font Typeface}}
       
\end{document}
```
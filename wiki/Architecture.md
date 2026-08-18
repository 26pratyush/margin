# Architecture

The finance application runs locally and owns local persistence. GitHub owns project history and documentation. Render hosts only the static product/demo website.

There is no hosted Margin API or hosted finance database in the initial product boundary.

The application should separate presentation, domain calculations, persistence, and export/backup so the core financial logic remains testable.

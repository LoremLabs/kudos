graph TD
    subgraph Ledger July 2022
    LEDGER[fa:fa-table Kudos Ledger]
    end    subgraph Web Page One
    CONTENT --> C{Get Creator Ids}
    C -->|"@alice"| LEDGER[fa:fa-table Kudos Ledger]
    C -->|"@bob"| LEDGER[fa:fa-table Kudos Ledger]
    C -->|"@carlos"| LEDGER[fa:fa-table Kudos Ledger]
    end
    subgraph Web Page Two
    CONTENT2 --> C2{Get Creator Ids}
    C2 -->|"@alice"| LEDGER[fa:fa-table Kudos Ledger]
    C2 -->|"@bob"| LEDGER[fa:fa-table Kudos Ledger]
    end

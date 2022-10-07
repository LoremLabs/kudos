graph LR
    subgraph Settlement_Service
    USER_PAYMENT("$100")
    ISVALID{"isValidAuth()"} --> KYCPASS{"passesKYC()"}        
    end
    subgraph Accounts
    alice("@alice")
    bob("@bob")
    end
    KYCPASS -- tx $66--> alice
    KYCPASS -- tx $33--> bob

# Signer

## Authenticate

```shell
$ signer --pvtkey 31xsL3ip55xVLQjF5zFHf6BCDwjdKN8kQXY472LAb2Qd9Qhb2GRbYmfYW4z7hTFNriwxfnFMuRMu5PL7xiA2gKSb authenticate
Enter the message to be signed:
{
  "@context": "https://w3id.org/security/v2",
  "nonce": "1600062484004"
}


Submit the following LD-Proof to the capability manager:
DID Document
{
    "@context": [
        "https://w3id.org/security/v2"
    ],
    "assertionMethod": [
        "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf#z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf"
    ],
    "authentication": [
        "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf#z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf"
    ],
    "capabilityDelegation": [
        "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf#z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf"
    ],
    "capabilityInvocation": [
        "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf#z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf"
    ],
    "id": "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf",
    "publicKey": [
        {
            "controller": "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf",
            "id": "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf#z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf",
            "publicKeyBase58": "75U3U2rgwbfkHAg78a8SJGbqdY4Ke3q6tymvM28Cbt1H",
            "type": "Ed25519VerificationKey2018"
        }
    ]
}

DID Signature
{
    "@context": "https://w3id.org/security/v2",
    "nonce": "1600062484004",
    "proof": {
        "@context": "https://w3id.org/security/v2",
        "created": "2020-09-16T14:56:08+08:00",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..IVGBbg4VmP2zOz5eAS_u6i0HLw3y5kLqFI-q4WT6TguOgRtRVBZZcLLhuWXGcG8KZuw39ibV88ogkOipdrOHBg",
        "type": "Ed25519Signature2018",
        "verificationMethod": "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf#z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf"
    }
}
```

## Invoke capabilities

> **WARNING**: The nonce is hard-coded currently.

```shell
$ signer --pvtkey 31xsL3ip55xVLQjF5zFHf6BCDwjdKN8kQXY472LAb2Qd9Qhb2GRbYmfYW4z7hTFNriwxfnFMuRMu5PL7xiA2gKSb invoke --cap capabilities.json --repo https://github.com/bitmark-inc/bitmark-sdk-go
Submit the following LD-Proof to the pre-push hook script:
{
    "@context": "https://w3id.org/security/v2",
    "nonce": "1600062484004",
    "proof": {
        "@context": "https://w3id.org/security/v2",
        "capability": "urn:uuid:7001024f-cefd-4ba1-9992-2fa30c379a9a",
        "created": "2020-09-16T14:27:48+08:00",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..7-bWGiGuvlMg25ISmRk5CBVLOBh1zplpG0HHAho4ZcKNiBUldg6wgOOZlOaXcGidMYQplcMFAB-qmy9_AkzeDg",
        "proofPurpose": "capabilityIncovation",
        "type": "Ed25519Signature2018",
        "verificationMethod": "did:key:z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf#z6MkkXj64H78H9ADPfWop96H9N9qT7LB3w5TazgrBJ6DX6nf"
    }
}
```
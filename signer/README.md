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
{
    "@context": "https://w3id.org/security/v2",
    "nonce": "1600062484004",
    "proof": {
        "@context": "https://w3id.org/security/v2",
        "created": "2020-09-16T14:25:37+08:00",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..M_esOJx5qMtlTMzdYbF5S29vk_bU58Ue6cSwDeArYjJ1JvleZ5TjcDRsbTo1pzUO0nMpud2ECN3MLdgM4bS4DQ",
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
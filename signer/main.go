package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/mr-tron/base58"
	"github.com/piprate/json-gold/ld"
	"github.com/square/go-jose"
	"github.com/urfave/cli"
)

const (
	SecurityContextV2URL = "https://w3id.org/security/v2"

	ProofTypeEd25519Signature2018 = "Ed25519Signature2018"
)

type Capability struct {
	ID               string `json:"id"`
	InvocationTarget string `json:"invocationTarget"`
	Invoker          string `json:"invoker"`
}

func authenticate(c *cli.Context) error {
	key, err := base58.Decode(c.GlobalString("pvtkey"))
	if err != nil {
		return err
	}
	privateKey := ed25519.PrivateKey(key)
	did := getDID(privateKey.Public().(ed25519.PublicKey))
	keyID := getKeyID(did)
	signingKey := jose.SigningKey{Algorithm: jose.EdDSA, Key: privateKey}

	fmt.Println("Enter the message to be signed:")
	msg := make(map[string]interface{})
	if err := json.NewDecoder(os.Stdin).Decode(&msg); err != nil {
		return err
	}

	proof := map[string]interface{}{
		"@context":           SecurityContextV2URL,
		"type":               ProofTypeEd25519Signature2018,
		"created":            time.Now().Format(time.RFC3339),
		"verificationMethod": keyID,
	}
	sign(msg, proof, signingKey, time.Now())

	data, err := json.MarshalIndent(msg, "", "    ")
	if err != nil {
		return err
	}
	fmt.Printf("\n\nSubmit the following LD-Proof to the capability manager:\n%s\n", data)

	return nil
}

// The enclave manager should manage keypairs, and select
// the corresponding private key to invoke the required capability.
// For example, a map of did to private key will suffice.
// Here we
func invokeCapability(c *cli.Context) error {
	privateKey, err := base58.Decode(c.GlobalString("pvtkey"))
	if err != nil {
		return err
	}
	signingKey := jose.SigningKey{Algorithm: jose.EdDSA, Key: ed25519.PrivateKey(privateKey)}

	file, err := os.Open(c.String("cap"))
	if err != nil {
		return err
	}

	caps := make([]*Capability, 0)
	if err := json.NewDecoder(file).Decode(&caps); err != nil {
		return err
	}

	var capability *Capability
	for _, cap := range caps {
		if cap.InvocationTarget == c.String("repo") {
			capability = cap
		}
	}
	if capability == nil {
		return fmt.Errorf("no capability for this repo")
	}

	// TODO: incr nonce
	msg := map[string]interface{}{
		"@context": SecurityContextV2URL,
		"nonce":    "1600062484004",
	}
	proof := map[string]interface{}{
		"@context":           SecurityContextV2URL,
		"type":               ProofTypeEd25519Signature2018,
		"created":            time.Now().Format(time.RFC3339),
		"verificationMethod": getKeyID(capability.Invoker),
		"proofPurpose":       "capabilityIncovation",
		"capability":         capability.ID,
	}
	sign(msg, proof, signingKey, time.Now())

	data, err := json.MarshalIndent(msg, "", "    ")
	if err != nil {
		return err
	}
	fmt.Printf("Submit the following LD-Proof to the pre-push hook script:\n%s\n", data)

	return nil
}

func getDID(publicKeyBytes []byte) string {
	prefix := []byte{0xed, 0x01}
	b := append(prefix, publicKeyBytes...)
	return fmt.Sprintf("did:key:z%s", base58.Encode(b))
}

func getKeyID(did string) string {
	parts := strings.Split(did, ":")
	keyID := fmt.Sprintf("%s#%s", did, parts[2])
	return keyID
}

func sign(doc, proof map[string]interface{}, signingKey jose.SigningKey, now time.Time) error {
	opts := new(jose.SignerOptions)
	opts.WithBase64(false)
	signer, err := jose.NewSigner(signingKey, opts)
	if err != nil {
		return err
	}

	// 1. normalize both proof and doc
	proc := ld.NewJsonLdProcessor()
	options := ld.NewJsonLdOptions("")
	options.Format = "application/n-quads"
	options.Algorithm = "URDNA2015"
	options.ProcessingMode = ld.JsonLd_1_1
	normalizedProof, _ := proc.Normalize(proof, options)
	normalizedDoc, _ := proc.Normalize(doc, options)

	// 2. create JWS payload
	proofHash := sha256.Sum256([]byte(normalizedProof.(string)))
	docHash := sha256.Sum256([]byte(normalizedDoc.(string)))
	payload := make([]byte, 0)
	payload = append(payload, proofHash[:]...)
	payload = append(payload, docHash[:]...)

	// 3. create detached Json Web Signature (JWS)
	jws, err := createDetachedJWS(signer, payload)
	if err != nil {
		return err
	}

	// 4. attach the signature and put the proof back
	proof["jws"] = jws
	doc["proof"] = proof

	return nil
}

func createDetachedJWS(signer jose.Signer, payload []byte) (string, error) {
	sig, err := signer.Sign(payload)
	if err != nil {
		return "", err
	}

	compactJWS, err := sig.CompactSerialize()
	if err != nil {
		return "", err
	}
	parts := strings.Split(compactJWS, ".")
	parts[1] = ""
	return strings.Join(parts, "."), nil
}

func main() {
	app := cli.NewApp()
	app.Name = "signer"
	app.Usage = ""
	app.Flags = []cli.Flag{
		cli.StringFlag{
			Name:  "pvtkey",
			Usage: "base58-encoded ED25519 private key",
		},
	}
	app.Commands = []cli.Command{
		{
			Name:   "authenticate",
			Usage:  "",
			Flags:  []cli.Flag{},
			Action: authenticate,
		},
		{
			Name:  "invoke",
			Usage: "",
			Flags: []cli.Flag{
				cli.StringFlag{
					Name:  "repo",
					Usage: "repo URL",
				},
				cli.StringFlag{
					Name:  "cap",
					Usage: "capability file",
				},
			},
			Action: invokeCapability,
		},
	}

	if err := app.Run(os.Args); err != nil {
		panic(err)
	}
}

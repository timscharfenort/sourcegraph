#!/bin/bash
set -ex

export GOOS=linux GOARCH=amd64 CGO_ENABLED=0

go get -u -d golang.org/x/tools/cmd/guru/... github.com/sourcegraph/godef/... sourcegraph.com/sourcegraph/srclib-go/gog/...
go build -o guru golang.org/x/tools/cmd/guru
go build -o godef github.com/sourcegraph/godef
go build -o gog sourcegraph.com/sourcegraph/srclib-go/gog/cmd/gog
go build -o langserver-go .

docker build -t us.gcr.io/sourcegraph-dev/langserver-go .
gcloud docker push us.gcr.io/sourcegraph-dev/langserver-go

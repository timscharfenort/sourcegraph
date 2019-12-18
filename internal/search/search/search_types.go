package search

import (
	"github.com/sourcegraph/sourcegraph/internal/gitserver"
	"github.com/sourcegraph/sourcegraph/internal/query"
	"github.com/sourcegraph/sourcegraph/internal/symbols/protocol"
	"github.com/sourcegraph/sourcegraph/internal/vcs/git"
)

type SearchTypeParameters interface {
	SearchTypeInputValue()
}

func (c CommitParameters) SearchTypeParametersValue()  {}
func (d DiffParameters) SearchTypeParametersValue()    {}
func (s SymbolsParameters) SearchTypeParametersValue() {}

type CommitParameters struct {
	RepoRevs           *RepositoryRevisions
	Info               *PatternInfo
	Query              *query.Query
	Diff               bool
	TextSearchOptions  git.TextSearchOptions
	ExtraMessageValues []string
}

type DiffParameters struct {
	Repo    gitserver.Repo
	Options git.RawLogDiffSearchOptions
}

type SymbolsParameters protocol.SearchArgs

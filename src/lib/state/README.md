# S-State (or SL)

S-State is a state library, heavily inspired in other libraries, most notably [jotai](TODO).

**Why build anohter state library?** Cause I wanted to hack on one. I don't expect anyone else to use this so I explore ideas freely here.

**What's different about it?** At the moment, a focus on:

- Being very lean and having a straight-forward implementation.
- Providing ways to access and change state imeratively
- Performance

## Usage

I've been using `s-state` mostly inside classes, as a way to keep the state of projects of mine outside react. I don't like keeping non-ui state inside React.

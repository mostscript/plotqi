Note:
-----

We needed (as of 2015-02-11) a newer version of NVD3 (1.7.1) than was
available via npm.  As a result, we use commonjs import of a newer build
downloaded from https://github.com/novus/nvd3

The downloaded version must be wrapped such that the IIFE containing the
NVD3 module returns the nv namespace, which is set to module.exports.

Fork vs non-fork:
-----------------

There is some confusion about whether the upstream NVD3 was abandoned and then
forked by community.  The current situation sounds like recent work (up to
1.7.0) was maintained in a fork, but the maintainer has now collaborate with
original upstream at https://github.com/novus/nvd3 to merge work from 
https://github.com/nvd3-community/nvd3 where most recent fork work was done.

So it appears that Novus is again involved in maintaining NVD3 in conjunction
with the community, and as such 1.7.1 build can be found at the original
upstream repository.

Updated 2015-02-11 / SDU


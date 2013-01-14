#!/usr/bin/perl -w

use strict;

use CGI qw(:cgi);
use Digest::SHA1  qw(sha1_hex);
use Fatal qw(chdir open);
use File::Basename qw(dirname);
use File::Slurp;
use File::Temp qw(tempfile);
use JSON;
use tracker;

chdir dirname $0;

my $q = CGI->new;

my $id = $q->param('game');
$id =~ s{.*/}{};
$id =~ s{[^A-Za-z0-9]}{}g;

my $orig_hash = $q->param('orig-hash');
my $new_content = $q->param('content');

my $dir = "../data/write/";

sub save {
    my $orig_content = read_file "$dir/$id";
    if (sha1_hex($orig_content) ne $orig_hash) {
        print STDERR "[$orig_hash] [", sha1_hex($orig_content), "]";
        die "Someone else made changes to the game. Please reload\n";
    }

    my ($fh, $filename) = tempfile("tmpfileXXXXXXX",
                                   DIR=>$dir);
    print $fh $new_content;
    close $fh;
    rename "$dir/$id", "$dir/$id.bak";
    rename $filename, "$dir/$id";
}

my $res = terra_mystica::evaluate_game split /\n/, $new_content;

if (!@{$res->{error}}) {
    eval {
        save;
    }; if ($@) {
        $res->{error} = [ $@ ]
    }
};

print "Content-type: text/json\r\n";
print "Cache-Control: no-cache\r\n";
print "\r\n";

my $out = encode_json {
    error => $res->{error},
    hash => sha1_hex($new_content),
};
print $out;

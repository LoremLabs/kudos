cd "$(dirname "$0")"
buildDir=`pwd`

echo "Building PDF from Markdown Files..."

# Assuming rfcs are stored with 000 style prefix
for rfcDir in $(ls .. | grep -i '[0-9][0-9][0-9]'); do   
    echo "Found $rfcDir..."          
    if [ -d "../$rfcDir" ]; then
        echo "Searching for Markdown Files in ../${rfcDir}..."
        ## Build pdf
        for filename in ../${rfcDir}/*.md; do
            echo "$filename found"
            [ -e "$filename" ] || continue
            outputFile="$(basename "${filename%.*}")"
            echo "Searching for ../${rfcDir}/${outputFile}.md"

            if [[ -e "../${rfcDir}/config/pandoc.yml" && -e "../${rfcDir}/config/kudos.latex" ]]; then            
                echo "Creating ../${rfcDir}/${outputFile}.pdf (with config from directory)..."
                cat ../${rfcDir}/config/pandoc.yml ../${rfcDir}/$filename > /tmp/md.$$.md && cd ../${rfcDir} && pandoc /tmp/md.$$.md -s --template=./config/kudos.latex -o ./$outputFile.pdf && rm /tmp/md.$$.md && cd ../..
            else
                if [[ -e "../${rfcDir}/config/pandoc.yml" ]]; then
                    echo "Creating ../${rfcDir}/${outputFile}.pdf with build template...$buildDir/config/kudos.latex"
                    cat ../${rfcDir}/config/pandoc.yml ../${rfcDir}/$filename > /tmp/md.$$.md && cd ../${rfcDir} && pandoc /tmp/md.$$.md -s --template=$buildDir/config/kudos.latex -o ./$outputFile.pdf && rm /tmp/md.$$.md && cd ../..                
                else
                    echo "Skipping ${rfcDir} because no pandoc.yml or kudos.latex found"
                fi
            fi
        done

    fi
done


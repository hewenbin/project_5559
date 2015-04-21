/////////////////////////////////////////////////////////
//Compile: g++ split_merge_tree.cpp -o split_merge_tree
////////////////////////////////////////////////////////

#include "cpp_headers.h"

using namespace std;

vector<float> split_float(string str, string sep)
{
    char* cstr=const_cast<char*>(str.c_str());
    char* current;
    vector<float> arr;
    current=strtok(cstr,sep.c_str());
    while(current != NULL){
        arr.push_back(atof(current));
        current=strtok(NULL, sep.c_str());
    }
    return arr;
}

int split_int(string str, string sep)
{
    char* cstr=const_cast<char*>(str.c_str());
    char* current;
    vector<float> arr;
    current=strtok(cstr,sep.c_str());
    while(current != NULL){
        arr.push_back(atoi(current));
        current=strtok(NULL, sep.c_str());
    }
    return arr[0];
}

//Parse a string of strings with a delimeter
vector<int> split_string_header(string str, string sep)
{
	int val;
    char* cstr=const_cast<char*>(str.c_str());
    char* current;
    vector<int> arr;
    current=strtok(cstr,sep.c_str());
    while(current != NULL)
    {
        arr.push_back(atoi(current));
        current=strtok(NULL, sep.c_str());
    }

    return arr;
}

//Parse a string of strings with a delimeter
string test_header(string str, string sep)
{
	char* cstr=const_cast<char*>(str.c_str());
    char* current;
    vector<string> arr;
    current=strtok(cstr,sep.c_str());
    while(current != NULL)
    {
        arr.push_back(current);
        current=strtok(NULL, sep.c_str());
    }

    return arr[0];
}

int main(int argc, char* argv[])
{
    ifstream file1 (argv[1]); //tree file
    ifstream file2 (argv[2]); //location file
    string value,value1;
    int numtree = 7497;
    int jump =0;


    //read out the header
    getline(file2, value1);

    for(int i=0;i<numtree;i++)
    {
	    getline(file2, value1);
	    vector<int> temp = split_string_header(value1," ");
	    jump = temp[2];
        file1.seekg(jump, ios_base::beg);
	    stringstream ss;
	    ss<<temp[0];
	    string fname = "../../public/data/trees/tree_" + ss.str() + ".csv";
	    ofstream out (fname.c_str());

	    // out<<"#tree "<<ss.str()<<endl;

	    while (getline(file1, value))
	    {

		    if(value.at(0) != '#')
		    {
                vector<float> vec = split_float(value, " ");
                out << *(vec.begin());
                for (auto it = vec.begin() + 1; it < vec.end(); ++it)
		    	  out << "," << *it;
                out << endl;
		    }
		    else
		    {
		    	break;
		    }

		}

		out.close();
	}

    return 0;
}
